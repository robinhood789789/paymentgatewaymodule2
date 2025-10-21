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

      // Fetch user membership and role info
      const { data: membershipData, error: membershipError } = await supabase
        .from("memberships")
        .select("tenant_id, role_id, roles(name), tenants(name)")
        .eq("user_id", userId)
        .maybeSingle();

      if (membershipError && !isSuperAdminUser) throw membershipError;

      if (membershipData) {
        const roleName = membershipData.roles?.name || null;
        setUserRole(roleName);
        setIsAdmin(isSuperAdminUser || roleName === "admin" || roleName === "owner");
        setTenantId(membershipData.tenant_id);
        setTenantName(membershipData.tenants?.name || null);
      } else if (isSuperAdminUser) {
        // Super admin doesn't need membership
        setUserRole("super_admin");
        setIsAdmin(true);
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

      // Check if user has 2FA enabled
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("totp_enabled, id")
        .eq("id", data.user?.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      if (profile?.totp_enabled) {
        // User has 2FA enabled, redirect to verification page
        toast.info("กรุณายืนยันตัวตนด้วย 2FA");
        navigate("/auth/two-factor", { 
          state: { 
            userId: profile.id,
            returnTo: "/dashboard" 
          } 
        });
      } else {
        // No 2FA, proceed to dashboard
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
