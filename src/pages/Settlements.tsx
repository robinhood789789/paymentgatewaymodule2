import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { RequireTenant } from "@/components/RequireTenant";
import { PermissionGate } from "@/components/PermissionGate";
import { SettlementsTable } from "@/components/SettlementsTable";
import { SettlementsSummary } from "@/components/SettlementsSummary";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { Skeleton } from "@/components/ui/skeleton";

const Settlements = () => {
  const { t } = useI18n();
  const { activeTenantId } = useTenantSwitcher();

  // Fetch all settlements for summary
  const { data: allSettlements = [], isLoading } = useQuery({
    queryKey: ["settlements-summary", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const { data, error } = await supabase
        .from("settlements")
        .select("*")
        .eq("tenant_id", activeTenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeTenantId,
  });
  
  return (
    <DashboardLayout>
      <RequireTenant>
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('settlements.title')}</h1>
              <p className="text-muted-foreground mt-1">{t('settlements.viewManage')}</p>
            </div>

            <PermissionGate 
              permission="payments.read"
              fallback={
                <div className="text-center p-12 border rounded-lg bg-muted/20">
                  <p className="text-muted-foreground">{t('settlements.noPermission')}</p>
                </div>
              }
            >
              {isLoading ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                  <Skeleton className="h-96 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <SettlementsSummary settlements={allSettlements} />
                  <SettlementsTable />
                </div>
              )}
            </PermissionGate>
          </div>
        </div>
      </RequireTenant>
    </DashboardLayout>
  );
};

export default Settlements;
