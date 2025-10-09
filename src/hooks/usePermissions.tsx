import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useTenantSwitcher } from "./useTenantSwitcher";

export const usePermissions = () => {
  const { user } = useAuth();
  const { activeTenantId } = useTenantSwitcher();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["user-permissions", user?.id, activeTenantId],
    queryFn: async () => {
      if (!user?.id || !activeTenantId) return [];

      // Get user's role in active tenant
      const { data: membership, error: membershipError } = await supabase
        .from("memberships")
        .select("role_id")
        .eq("user_id", user.id)
        .eq("tenant_id", activeTenantId)
        .single();

      if (membershipError || !membership) return [];

      // Get permissions for this role
      const { data: rolePermissions, error: permissionsError } = await supabase
        .from("role_permissions")
        .select("permissions(name)")
        .eq("role_id", membership.role_id);

      if (permissionsError) return [];

      return rolePermissions.map((rp) => rp.permissions.name);
    },
    enabled: !!user?.id && !!activeTenantId,
  });

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some((p) => permissions.includes(p));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every((p) => permissions.includes(p));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
  };
};
