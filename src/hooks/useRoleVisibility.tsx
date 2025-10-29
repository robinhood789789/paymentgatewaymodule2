import { useTenantSwitcher } from "./useTenantSwitcher";
import { useAuth } from "./useAuth";

export type UserRole = 'owner' | 'manager' | 'finance' | 'developer';

export const useRoleVisibility = () => {
  const { activeTenant } = useTenantSwitcher();
  const { isSuperAdmin } = useAuth();
  
  const currentRole = activeTenant?.roles?.name as UserRole | undefined;
  
  // Owner sees everything
  const isOwner = currentRole === 'owner';
  const isManager = currentRole === 'manager';
  const isFinance = currentRole === 'finance';
  const isDeveloper = currentRole === 'developer';
  
  return {
    currentRole,
    isOwner,
    isManager,
    isFinance,
    isDeveloper,
    isSuperAdmin,
    
    // Widget visibility - Finance has access to financial operations
    canViewFinancialOverview: isOwner || isManager || isFinance,
    canViewPayments: isOwner || isManager || isFinance,
    canViewPayouts: isOwner || isManager || isFinance,
    canViewApprovals: isOwner || isManager,
    canViewRiskAlerts: isOwner || isManager,
    canViewAPIMetrics: isOwner || isDeveloper || isManager,
    canViewWebhooks: isOwner || isDeveloper || isManager,
    
    // Quick actions - Finance can perform basic financial operations
    canCreatePayout: isOwner || isManager || isFinance,
    canApprovePayout: isOwner || isManager,
    canCreatePaymentLink: isOwner || isManager,
    canManageAPIKeys: isOwner || isDeveloper,
    canTestWebhooks: isOwner || isDeveloper,
    canExportData: isOwner || isManager || isFinance,
  };
};
