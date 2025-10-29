import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ACTIVE_TENANT_KEY = "active_tenant_id";

interface Membership {
  id: string;
  tenant_id: string;
  role_id: string;
  roles: {
    name: string;
  };
  tenants: {
    id: string;
    name: string;
    status: string;
  };
}

export const useTenantSwitcher = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const getStorageKey = (uid?: string | null) => (uid ? `${ACTIVE_TENANT_KEY}:${uid}` : ACTIVE_TENANT_KEY);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => {
    // Try to read from localStorage - check all possible keys
    try {
      // Try generic key first (backward compatible)
      const generic = localStorage.getItem(ACTIVE_TENANT_KEY);
      if (generic) return generic;
      
      // Try to find any user-scoped key
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${ACTIVE_TENANT_KEY}:`)) {
          const value = localStorage.getItem(key);
          if (value) return value;
        }
      }
    } catch {
      // Silently fail
    }
    return null;
  });

  // Fetch user memberships
  const { data: memberships, isLoading } = useQuery({
    queryKey: ["user-memberships", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Step 1: Get memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from("memberships")
        .select("id, tenant_id, role_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (membershipError) throw membershipError;
      if (!membershipData || membershipData.length === 0) return [];

      // Step 2: Get role names for these memberships
      const roleIds = [...new Set(membershipData.map(m => m.role_id))];
      const { data: rolesData } = await supabase
        .from("roles")
        .select("id, name")
        .in("id", roleIds);

      // Step 3: Get tenant details for these memberships
      const tenantIds = [...new Set(membershipData.map(m => m.tenant_id))];
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("id, name, status")
        .in("id", tenantIds);

      // Step 4: Combine the data
      const rolesMap = new Map(rolesData?.map(r => [r.id, r]) || []);
      const tenantsMap = new Map(tenantsData?.map(t => [t.id, t]) || []);

      const result = membershipData.map(m => ({
        id: m.id,
        tenant_id: m.tenant_id,
        role_id: m.role_id,
        roles: rolesMap.get(m.role_id) || { name: 'finance' },
        tenants: tenantsMap.get(m.tenant_id) || { id: m.tenant_id, name: 'Unknown', status: 'active' }
      }));

      return result as Membership[];
    },
    enabled: !!user?.id,
  });

  // Get current active tenant details
  const activeTenant = memberships?.find((m) => m.tenant_id === activeTenantId);

  // Auto-select preferred tenant: pick the most recently created membership (already ordered desc)
  useEffect(() => {
    if (memberships && memberships.length > 0 && !activeTenantId) {
      const preferred = memberships[0];
      if (preferred?.tenants) {
        setActiveTenantId(preferred.tenant_id);
        try { localStorage.setItem(getStorageKey(user?.id), preferred.tenant_id); } catch {}
      }
    }
  }, [memberships, activeTenantId, user?.id]);

  // Auto-correct invalid stored tenant selection
  useEffect(() => {
    if (!isLoading && memberships) {
      if (activeTenantId && memberships.length > 0) {
        const exists = memberships.some((m) => m.tenant_id === activeTenantId);
        if (!exists) {
          const nextTenant = memberships[0];
          if (nextTenant?.tenants) {
            setActiveTenantId(nextTenant.tenant_id);
            try { localStorage.setItem(getStorageKey(user?.id), nextTenant.tenant_id); } catch {}
            // Refresh queries for corrected tenant
            queryClient.invalidateQueries();
            toast.info(`Switched to ${nextTenant.tenants.name}`, {
              description: "Your previous workspace was unavailable.",
            });
          }
        }
      }
      // Migrate old generic key to per-user key when user loads
      if (user?.id) {
        try {
          const legacy = localStorage.getItem(ACTIVE_TENANT_KEY);
          const userScoped = localStorage.getItem(getStorageKey(user.id));
          if (!userScoped && legacy) {
            localStorage.setItem(getStorageKey(user.id), legacy);
            localStorage.removeItem(ACTIVE_TENANT_KEY);
          }
        } catch {}
      }
    }
  }, [activeTenantId, memberships, isLoading, queryClient, user?.id]);

  // Switch active tenant
  const switchTenant = (tenantId: string) => {
    const membership = memberships?.find((m) => m.tenant_id === tenantId);
    if (!membership || !membership.tenants) {
      toast.error("Invalid tenant selection");
      return;
    }

    setActiveTenantId(tenantId);
    try { localStorage.setItem(getStorageKey(user?.id), tenantId); } catch {}
    
    // Invalidate all queries to refresh data for new tenant
    queryClient.invalidateQueries();
    
    toast.success(`Switched to ${membership.tenants.name}`);
  };

  return {
    memberships: memberships || [],
    activeTenantId,
    activeTenant,
    switchTenant,
    isLoading,
    hasMultipleTenants: (memberships?.length || 0) > 1,
  };
};
