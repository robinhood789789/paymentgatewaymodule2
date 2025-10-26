import DashboardLayout from "@/components/DashboardLayout";
import { RequireTenant } from "@/components/RequireTenant";
import { PaymentsTable } from "@/components/PaymentsTable";
import { PaymentsStats } from "@/components/PaymentsStats";
import { useI18n } from "@/lib/i18n";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";

const Payments = () => {
  const { t } = useI18n();
  const { activeTenant } = useTenantSwitcher();
  
  // เช็คว่าเป็น Owner, Admin หรือ Manager เท่านั้น
  const userRole = activeTenant?.roles?.name;
  const hasAccess = userRole === "owner" || userRole === "admin" || userRole === "manager";
  
  return (
    <DashboardLayout>
      <RequireTenant>
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('payments.title')}</h1>
              <p className="text-muted-foreground">{t('payments.viewManage')}</p>
            </div>

            {hasAccess ? (
              <>
                <PaymentsStats />
                <PaymentsTable />
              </>
            ) : (
              <div className="text-center p-8 border rounded-lg">
                <p className="text-muted-foreground">{t('payments.noPermission')}</p>
              </div>
            )}
          </div>
        </div>
      </RequireTenant>
    </DashboardLayout>
  );
};

export default Payments;
