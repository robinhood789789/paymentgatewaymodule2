import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
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
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_TENANT_KEY);
  });

  // Fetch user memberships
  const { data: memberships, isLoading } = useQuery({
    queryKey: ["user-memberships", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Step 1: Get memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from("memberships")
        .select("id, tenant_id, role_id, user_id, created_at")
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

      return membershipData.map(m => ({
        ...m,
        roles: rolesMap.get(m.role_id) || { name: 'viewer' },
        tenants: tenantsMap.get(m.tenant_id) || { id: m.tenant_id, name: 'Unknown', status: 'active' }
      })) as Membership[];
    },
    enabled: !!user?.id,
  });

  // Get current active tenant details
  const activeTenant = memberships?.find((m) => m.tenant_id === activeTenantId);

  // Auto-select preferred tenant (prefer 'owner' role) if none is selected
  useEffect(() => {
    if (memberships && memberships.length > 0 && !activeTenantId) {
      const ownerMembership = memberships.find((m) => m.roles?.name === "owner");
      const preferred = ownerMembership ?? memberships[0];
      if (preferred?.tenants) {
        setActiveTenantId(preferred.tenant_id);
        localStorage.setItem(ACTIVE_TENANT_KEY, preferred.tenant_id);
      }
    }
  }, [memberships, activeTenantId]);

  // Auto-correct invalid stored tenant selection
  useEffect(() => {
    if (!isLoading && memberships) {
      if (activeTenantId && memberships.length > 0) {
        const exists = memberships.some((m) => m.tenant_id === activeTenantId);
        if (!exists) {
          const ownerMembership = memberships.find((m) => m.roles?.name === "owner");
          const nextTenant = ownerMembership ?? memberships[0];
          if (nextTenant?.tenants) {
            setActiveTenantId(nextTenant.tenant_id);
            localStorage.setItem(ACTIVE_TENANT_KEY, nextTenant.tenant_id);
            // Refresh queries for corrected tenant
            queryClient.invalidateQueries();
            toast.info(`Switched to ${nextTenant.tenants.name}`, {
              description: "Your previous workspace was unavailable.",
            });
          }
        }
      }
    }
  }, [activeTenantId, memberships, isLoading, queryClient]);

  // Switch active tenant
  const switchTenant = (tenantId: string) => {
    const membership = memberships?.find((m) => m.tenant_id === tenantId);
    if (!membership || !membership.tenants) {
      toast.error("Invalid tenant selection");
      return;
    }

    setActiveTenantId(tenantId);
    localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
    
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
