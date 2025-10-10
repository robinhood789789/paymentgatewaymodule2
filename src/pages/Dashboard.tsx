import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, CreditCard, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { RequireTenant } from "@/components/RequireTenant";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useI18n } from "@/lib/i18n";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

const Dashboard = () => {
  const { user } = useAuth();
  const { activeTenantId, activeTenant } = useTenantSwitcher();
  const { t } = useI18n();

  const { data: todayStats, isLoading: loadingToday } = useQuery({
    queryKey: ["payment-stats-today", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;

      const today = new Date();
      const startToday = startOfDay(today);

      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("tenant_id", activeTenantId)
        .gte("created_at", startToday.toISOString());

      const succeeded = payments?.filter(p => p.status === "succeeded") || [];
      const totalAmount = succeeded.reduce((sum, p) => sum + p.amount, 0);

      return {
        count: succeeded.length,
        amount: totalAmount / 100,
        total: payments?.length || 0,
      };
    },
    enabled: !!activeTenantId,
  });

  const { data: weekStats, isLoading: loadingWeek } = useQuery({
    queryKey: ["payment-stats-week", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;

      const sevenDaysAgo = startOfDay(subDays(new Date(), 7));

      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("tenant_id", activeTenantId)
        .gte("created_at", sevenDaysAgo.toISOString());

      const succeeded = payments?.filter(p => p.status === "succeeded") || [];
      const totalAmount = succeeded.reduce((sum, p) => sum + p.amount, 0);

      return {
        count: succeeded.length,
        amount: totalAmount / 100,
        total: payments?.length || 0,
      };
    },
    enabled: !!activeTenantId,
  });

  const { data: recentPayments, isLoading: loadingRecent } = useQuery({
    queryKey: ["recent-payments", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];

      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", activeTenantId)
        .order("created_at", { ascending: false })
        .limit(5);

      return data || [];
    },
    enabled: !!activeTenantId,
  });

  const { data: methodBreakdown, isLoading: loadingMethods } = useQuery({
    queryKey: ["method-breakdown", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];

      const { data: payments } = await supabase
        .from("payments")
        .select("method, amount")
        .eq("tenant_id", activeTenantId)
        .eq("status", "succeeded");

      const grouped = (payments || []).reduce((acc, p) => {
        const method = p.method || "unknown";
        if (!acc[method]) acc[method] = 0;
        acc[method] += p.amount / 100;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    },
    enabled: !!activeTenantId,
  });

  const stats = [
    {
      title: t('dashboard.todayPayments'),
      value: loadingToday ? "-" : todayStats?.count || 0,
      subValue: loadingToday ? "-" : `฿${todayStats?.amount.toLocaleString() || 0}`,
      icon: DollarSign,
    },
    {
      title: t('dashboard.weekPayments'),
      value: loadingWeek ? "-" : weekStats?.count || 0,
      subValue: loadingWeek ? "-" : `฿${weekStats?.amount.toLocaleString() || 0}`,
      icon: TrendingUp,
    },
    {
      title: t('dashboard.todaySuccessRate'),
      value: loadingToday ? "-" : todayStats?.total ? `${((todayStats.count / todayStats.total) * 100).toFixed(1)}%` : "0%",
      subValue: loadingToday ? "-" : `${todayStats?.count || 0}/${todayStats?.total || 0}`,
      icon: Activity,
    },
    {
      title: t('dashboard.weekSuccessRate'),
      value: loadingWeek ? "-" : weekStats?.total ? `${((weekStats.count / weekStats.total) * 100).toFixed(1)}%` : "0%",
      subValue: loadingWeek ? "-" : `${weekStats?.count || 0}/${weekStats?.total || 0}`,
      icon: CreditCard,
    },
  ];

  return (
    <DashboardLayout>
      <RequireTenant>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
            <p className="text-muted-foreground">
              {t('dashboard.welcomeBack')}, {user?.email}!
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loadingToday || loadingWeek ? (
                      <>
                        <Skeleton className="h-8 w-24 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className="text-xs text-muted-foreground">{stat.subValue}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.recentPayments')}</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRecent ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : !recentPayments || recentPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">{t('dashboard.noPaymentsYet')}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('dashboard.noPaymentsDesc')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">฿{(payment.amount / 100).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.created_at), "PPp")}
                          </p>
                        </div>
                        <Badge variant={payment.status === "succeeded" ? "default" : "secondary"}>
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.paymentMethods')}</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingMethods ? (
                  <Skeleton className="h-64 w-full" />
                ) : !methodBreakdown || methodBreakdown.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">{t('dashboard.noDataAvailable')}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('dashboard.methodBreakdownDesc')}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={methodBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {methodBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </RequireTenant>
    </DashboardLayout>
  );
};

export default Dashboard;
