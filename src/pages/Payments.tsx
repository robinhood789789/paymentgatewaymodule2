import DashboardLayout from "@/components/DashboardLayout";
import { RequireTenant } from "@/components/RequireTenant";
import { PaymentsTable } from "@/components/PaymentsTable";
import { PaymentsStats } from "@/components/PaymentsStats";
import { useI18n } from "@/lib/i18n";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";

const Payments = () => {
  const { t } = useI18n();
  const { activeTenant } = useTenantSwitcher();
  const userRole = activeTenant?.roles?.name;
  
  const isAllowedRole = userRole === "owner" || userRole === "admin" || userRole === "manager";
  
  return (
    <DashboardLayout>
      <RequireTenant>
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('payments.title')}</h1>
              <p className="text-muted-foreground">{t('payments.viewManage')}</p>
            </div>

            {isAllowedRole ? (
              <>
                <PaymentsStats />
                <PaymentsTable />
              </>
            ) : (
              <div className="text-center p-8 border rounded-lg">
                <p className="text-muted-foreground">
                  Access restricted to Owner, Admin, and Manager roles only
                </p>
              </div>
            )}
          </div>
        </div>
      </RequireTenant>
    </DashboardLayout>
  );
};

export default Payments;
