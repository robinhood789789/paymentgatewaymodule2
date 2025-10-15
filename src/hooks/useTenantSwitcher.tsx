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

      const { data, error } = await supabase
        .from("memberships")
        .select("id, tenant_id, role_id, roles(name), tenants(id, name, status)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Membership[];
    },
    enabled: !!user?.id,
  });

  // Get current active tenant details
  const activeTenant = memberships?.find((m) => m.tenant_id === activeTenantId);

  // Auto-select first tenant if none is selected
  useEffect(() => {
    if (memberships && memberships.length > 0 && !activeTenantId) {
      const firstTenant = memberships[0];
      setActiveTenantId(firstTenant.tenant_id);
      localStorage.setItem(ACTIVE_TENANT_KEY, firstTenant.tenant_id);
    }
  }, [memberships, activeTenantId]);

  // Auto-correct invalid stored tenant selection
  useEffect(() => {
    if (!isLoading && memberships) {
      if (activeTenantId && memberships.length > 0) {
        const exists = memberships.some((m) => m.tenant_id === activeTenantId);
        if (!exists) {
          const nextTenant = memberships[0];
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
  }, [activeTenantId, memberships, isLoading, queryClient]);

  // Switch active tenant
  const switchTenant = (tenantId: string) => {
    const membership = memberships?.find((m) => m.tenant_id === tenantId);
    if (!membership) {
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
