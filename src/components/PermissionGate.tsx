import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  allowOwner?: boolean;
}

/**
 * Component that conditionally renders children based on user permissions
 * 
 * @param permission - Single permission to check
 * @param permissions - Array of permissions to check
 * @param requireAll - If true, user must have all permissions. If false, any permission is sufficient
 * @param fallback - Optional component to render when permission check fails
 */
export const PermissionGate = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  allowOwner = false,
}: PermissionGateProps) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();
  const { activeTenant } = useTenantSwitcher();
  const isOwner = activeTenant?.roles?.name === "owner";

  if (isLoading) {
    return null;
  }

  if (allowOwner && isOwner) {
    return <>{children}</>;
  }

  // Check single permission
  if (permission) {
    return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    return hasAccess ? <>{children}</> : <>{fallback}</>;
  }

  // No permissions specified, render children
  return <>{children}</>;
};
