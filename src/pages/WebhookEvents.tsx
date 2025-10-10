import DashboardLayout from "@/components/DashboardLayout";
import { RequireTenant } from "@/components/RequireTenant";
import { PermissionGate } from "@/components/PermissionGate";
import { WebhookEventsTable } from "@/components/WebhookEventsTable";
import { useI18n } from "@/lib/i18n";

const WebhookEvents = () => {
  const { t } = useI18n();
  
  return (
    <DashboardLayout>
      <RequireTenant>
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('webhookEvents.title')}</h1>
              <p className="text-muted-foreground">{t('webhookEvents.viewManage')}</p>
            </div>

            <PermissionGate 
              permission="webhooks:read"
              fallback={
                <div className="text-center p-8 border rounded-lg">
                  <p className="text-muted-foreground">{t('webhookEvents.noPermission')}</p>
                </div>
              }
            >
              <WebhookEventsTable />
            </PermissionGate>
          </div>
        </div>
      </RequireTenant>
    </DashboardLayout>
  );
};

export default WebhookEvents;
