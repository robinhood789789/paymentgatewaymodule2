import { useTenantSwitcher } from "./useTenantSwitcher";
import { useAuth } from "./useAuth";

export type UserRole = 'owner' | 'manager' | 'finance' | 'developer' | 'admin';

export const useRoleVisibility = () => {
  const { activeTenant } = useTenantSwitcher();
  const { isSuperAdmin } = useAuth();
  
  const currentRole = activeTenant?.roles?.name as UserRole | undefined;
  
  // Owner sees everything
  const isOwner = currentRole === 'owner';
  const isManager = currentRole === 'manager';
  const isFinance = currentRole === 'finance';
  const isDeveloper = currentRole === 'developer';
  const isAdmin = currentRole === 'admin';
  
  return {
    currentRole,
    isOwner,
    isManager,
    isFinance,
    isDeveloper,
    isAdmin,
    isSuperAdmin,
    
    // Widget visibility - Admin has comprehensive access like Manager
    canViewFinancialOverview: isOwner || isManager || isFinance || isAdmin,
    canViewPayments: isOwner || isManager || isFinance || isAdmin,
    canViewPayouts: isOwner || isManager || isFinance || isAdmin,
    canViewApprovals: isOwner || isManager || isAdmin,
    canViewRiskAlerts: isOwner || isManager || isAdmin,
    canViewAPIMetrics: isOwner || isDeveloper || isManager || isAdmin,
    canViewWebhooks: isOwner || isDeveloper || isManager || isAdmin,
    
    // Quick actions - Admin can perform most management actions
    canCreatePayout: isOwner || isManager || isFinance || isAdmin,
    canApprovePayout: isOwner || isManager || isAdmin,
    canCreatePaymentLink: isOwner || isManager || isAdmin,
    canManageAPIKeys: isOwner || isDeveloper || isAdmin,
    canTestWebhooks: isOwner || isDeveloper || isAdmin,
    canExportData: isOwner || isManager || isFinance || isAdmin,
  };
};
