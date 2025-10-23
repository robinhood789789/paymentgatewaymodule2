import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userRole: string | null;
  tenantId: string | null;
  tenantName: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role when session changes
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setUserRole(null);
          setTenantId(null);
          setTenantName(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      console.log("Fetching user role for:", userId);
      
      // Check if user is super admin first
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("is_super_admin, email, full_name")
        .eq("id", userId)
        .maybeSingle();

      console.log("Profile data:", profileData);
      console.log("Profile error:", profileError);

      if (profileError) throw profileError;

      const isSuperAdminUser = profileData?.is_super_admin || false;
      console.log("Is super admin:", isSuperAdminUser);
      setIsSuperAdmin(isSuperAdminUser);

      // Get active tenant from localStorage (same as useTenantSwitcher)
      const activeTenantId = localStorage.getItem("active_tenant_id");

      // Fetch user membership info - get ALL memberships first
      const { data: allMemberships, error: membershipError } = await supabase
        .from("memberships")
        .select("tenant_id, role_id")
        .eq("user_id", userId);

      if (membershipError && !isSuperAdminUser) {
        console.error("Membership error:", membershipError);
        if (!isSuperAdminUser) throw membershipError;
      }

      // Select membership for active tenant, or first one if no active tenant
      let membershipData = null;
      if (allMemberships && allMemberships.length > 0) {
        if (activeTenantId) {
          membershipData = allMemberships.find(m => m.tenant_id === activeTenantId);
        }
        // Fallback to first membership if no active tenant or not found
        if (!membershipData) {
          membershipData = allMemberships[0];
        }
      }

      if (membershipData) {
        // Fetch role name separately
        const { data: roleData } = await supabase
          .from("roles")
          .select("name")
          .eq("id", membershipData.role_id)
          .maybeSingle();

        // Fetch tenant name separately
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", membershipData.tenant_id)
          .maybeSingle();

        const roleName = roleData?.name || null;
        setUserRole(roleName);
        setIsAdmin(isSuperAdminUser || roleName === "admin" || roleName === "owner");
        setTenantId(membershipData.tenant_id);
        setTenantName(tenantData?.name || null);
        
        console.log("Role fetched successfully:", {
          roleName,
          tenantName: tenantData?.name,
          isAdmin: isSuperAdminUser || roleName === "admin" || roleName === "owner",
          isSuperAdmin: isSuperAdminUser,
          activeTenantId
        });
      } else if (isSuperAdminUser) {
        // Super admin doesn't need membership
        setUserRole("super_admin");
        setIsAdmin(true);
        console.log("Super admin detected, no membership required");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch user profile and role info
      const { data: profile } = await supabase
        .from("profiles")
        .select("totp_enabled, id, is_super_admin")
        .eq("id", data.user?.id)
        .single();

      // Fetch membership to get role and tenant - get ALL memberships
      const { data: allMemberships } = await supabase
        .from("memberships")
        .select("role_id, tenant_id")
        .eq("user_id", data.user?.id);

      // Get active tenant or use first membership
      const activeTenantId = localStorage.getItem("active_tenant_id");
      let membership = null;
      
      if (allMemberships && allMemberships.length > 0) {
        if (activeTenantId) {
          membership = allMemberships.find(m => m.tenant_id === activeTenantId);
        }
        if (!membership) {
          membership = allMemberships[0];
        }
      }

      // Get role name if membership exists
      let role = null;
      if (membership?.role_id) {
        const { data: roleData } = await supabase
          .from("roles")
          .select("name")
          .eq("id", membership.role_id)
          .maybeSingle();
        role = roleData?.name;
      }

      const tenantId = membership?.tenant_id;
      const isSuperAdmin = profile?.is_super_admin || false;

      // Check if MFA is required
      let mfaRequired = false;

      if (isSuperAdmin) {
        // Super admin always requires MFA
        mfaRequired = true;
      } else if (tenantId && (role === 'owner' || role === 'admin')) {
        // Check tenant security policy
        const { data: policy } = await supabase
          .from("tenant_security_policy")
          .select("require_2fa_for_owner, require_2fa_for_admin")
          .eq("tenant_id", tenantId)
          .single();

        if (policy) {
          if (role === 'owner' && policy.require_2fa_for_owner) {
            mfaRequired = true;
          } else if (role === 'admin' && policy.require_2fa_for_admin) {
            mfaRequired = true;
          }
        }
      }

      // Handle MFA flow
      if (mfaRequired) {
        if (!profile?.totp_enabled) {
          // MFA required but not enrolled, redirect to settings
          toast.info("Two-Factor Authentication is required for your role. Please enable it.");
          navigate("/settings", { state: { tab: 'security' } });
          return { error: null };
        }

        // MFA enabled, redirect to challenge
        toast.info("กรุณายืนยันตัวตนด้วย 2FA");
        navigate("/auth/mfa-challenge", { 
          state: { 
            returnTo: "/dashboard" 
          } 
        });
        return { error: null };
      }

      // Check if user has 2FA enabled (optional MFA)
      if (profile?.totp_enabled) {
        toast.info("กรุณายืนยันตัวตนด้วย 2FA");
        navigate("/auth/mfa-challenge", { 
          state: { 
            returnTo: "/dashboard" 
          } 
        });
      } else {
        // No MFA, proceed to dashboard
        toast.success("Sign in successful!");
        navigate("/dashboard");
      }
      
      return { error: null };
    } catch (error: any) {
      toast.error("เข้าสู่ระบบไม่สำเร็จ", {
        description: error.message,
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast.error("Sign up failed", {
        description: error.message,
      });
    } else {
      toast.success("Sign up successful!", {
        description: "Logging you in...",
      });
      navigate("/dashboard");
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setUserRole(null);
    setTenantId(null);
    setTenantName(null);
    try { localStorage.removeItem("active_tenant_id"); } catch {}
    toast.success("Signed out successfully");
    navigate("/auth/sign-in");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        isAdmin,
        isSuperAdmin,
        userRole,
        tenantId,
        tenantName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
