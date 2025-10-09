import DashboardLayout from "@/components/DashboardLayout";
import { RequireTenant } from "@/components/RequireTenant";
import { PermissionGate } from "@/components/PermissionGate";
import { PaymentsTable } from "@/components/PaymentsTable";
import { useI18n } from "@/lib/i18n";

const Payments = () => {
  const { t } = useI18n();
  
  return (
    <DashboardLayout>
      <RequireTenant>
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('payments.title')}</h1>
              <p className="text-muted-foreground">{t('payments.viewManage')}</p>
            </div>

            <PermissionGate 
              permission="payments:read"
              fallback={
                <div className="text-center p-8 border rounded-lg">
                  <p className="text-muted-foreground">{t('payments.noPermission')}</p>
                </div>
              }
            >
              <PaymentsTable />
            </PermissionGate>
          </div>
        </div>
      </RequireTenant>
    </DashboardLayout>
  );
};

export default Payments;
