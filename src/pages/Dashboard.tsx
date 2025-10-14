import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Users, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { RequireTenant } from "@/components/RequireTenant";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, subMonths, startOfDay } from "date-fns";
import { useI18n } from "@/lib/i18n";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const { activeTenantId } = useTenantSwitcher();
  const { t } = useI18n();

  // Wallet balance
  const { data: wallet } = useQuery({
    queryKey: ["wallet", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      const { data } = await supabase
        .from("tenant_wallets")
        .select("*")
        .eq("tenant_id", activeTenantId)
        .single();
      return data;
    },
    enabled: !!activeTenantId,
  });

  // Current month deposits
  const { data: currentMonthDeposits, isLoading: loadingCurrentDeposits } = useQuery({
    queryKey: ["deposits-current-month", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return { total: 0, count: 0 };
      const startDate = startOfMonth(new Date());
      const { data } = await supabase
        .from("payments")
        .select("amount")
        .eq("tenant_id", activeTenantId)
        .eq("type", "deposit")
        .eq("status", "succeeded")
        .gte("created_at", startDate.toISOString());
      
      const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      return { total: total / 100, count: data?.length || 0 };
    },
    enabled: !!activeTenantId,
  });

  // Last month deposits
  const { data: lastMonthDeposits } = useQuery({
    queryKey: ["deposits-last-month", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return { total: 0 };
      const startDate = startOfMonth(subMonths(new Date(), 1));
      const endDate = startOfMonth(new Date());
      const { data } = await supabase
        .from("payments")
        .select("amount")
        .eq("tenant_id", activeTenantId)
        .eq("type", "deposit")
        .eq("status", "succeeded")
        .gte("created_at", startDate.toISOString())
        .lt("created_at", endDate.toISOString());
      
      const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      return { total: total / 100 };
    },
    enabled: !!activeTenantId,
  });

  // Current month withdrawals
  const { data: currentMonthWithdrawals, isLoading: loadingCurrentWithdrawals } = useQuery({
    queryKey: ["withdrawals-current-month", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return { total: 0, count: 0 };
      const startDate = startOfMonth(new Date());
      const { data } = await supabase
        .from("payments")
        .select("amount")
        .eq("tenant_id", activeTenantId)
        .eq("type", "withdrawal")
        .eq("status", "succeeded")
        .gte("created_at", startDate.toISOString());
      
      const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      return { total: total / 100, count: data?.length || 0 };
    },
    enabled: !!activeTenantId,
  });

  // Last month withdrawals
  const { data: lastMonthWithdrawals } = useQuery({
    queryKey: ["withdrawals-last-month", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return { total: 0 };
      const startDate = startOfMonth(subMonths(new Date(), 1));
      const endDate = startOfMonth(new Date());
      const { data } = await supabase
        .from("payments")
        .select("amount")
        .eq("tenant_id", activeTenantId)
        .eq("type", "withdrawal")
        .eq("status", "succeeded")
        .gte("created_at", startDate.toISOString())
        .lt("created_at", endDate.toISOString());
      
      const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      return { total: total / 100 };
    },
    enabled: !!activeTenantId,
  });

  // Today's transactions
  const { data: todayStats } = useQuery({
    queryKey: ["today-stats", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return { count: 0 };
      const today = startOfDay(new Date());
      const { data } = await supabase
        .from("payments")
        .select("id")
        .eq("tenant_id", activeTenantId)
        .gte("created_at", today.toISOString());
      
      return { count: data?.length || 0 };
    },
    enabled: !!activeTenantId,
  });

  // All transactions
  const { data: allTransactions } = useQuery({
    queryKey: ["all-transactions", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return { deposits: 0, withdrawals: 0 };
      const { data } = await supabase
        .from("payments")
        .select("type")
        .eq("tenant_id", activeTenantId);
      
      const deposits = data?.filter(p => p.type === "deposit").length || 0;
      const withdrawals = data?.filter(p => p.type === "withdrawal").length || 0;
      return { deposits, withdrawals };
    },
    enabled: !!activeTenantId,
  });

  // Deposit transactions
  const { data: depositStats } = useQuery({
    queryKey: ["deposit-stats", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return { total: 0, successful: 0 };
      const { data } = await supabase
        .from("payments")
        .select("status")
        .eq("tenant_id", activeTenantId)
        .eq("type", "deposit");
      
      const successful = data?.filter(p => p.status === "succeeded").length || 0;
      return { total: data?.length || 0, successful };
    },
    enabled: !!activeTenantId,
  });

  // Withdrawal transactions
  const { data: withdrawalStats } = useQuery({
    queryKey: ["withdrawal-stats", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return { total: 0, successful: 0 };
      const { data } = await supabase
        .from("payments")
        .select("status")
        .eq("tenant_id", activeTenantId)
        .eq("type", "withdrawal");
      
      const successful = data?.filter(p => p.status === "succeeded").length || 0;
      return { total: data?.length || 0, successful };
    },
    enabled: !!activeTenantId,
  });

  // Total users (memberships)
  const { data: usersCount } = useQuery({
    queryKey: ["users-count", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return { count: 0 };
      const { data } = await supabase
        .from("memberships")
        .select("id")
        .eq("tenant_id", activeTenantId);
      
      return { count: data?.length || 0 };
    },
    enabled: !!activeTenantId,
  });

  // Recent transactions
  const { data: recentTransactions, isLoading: loadingRecent } = useQuery({
    queryKey: ["recent-transactions", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", activeTenantId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!activeTenantId,
  });

  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const depositChange = calculatePercentChange(
    currentMonthDeposits?.total || 0,
    lastMonthDeposits?.total || 0
  );

  const withdrawalChange = calculatePercentChange(
    currentMonthWithdrawals?.total || 0,
    lastMonthWithdrawals?.total || 0
  );

  return (
    <DashboardLayout>
      <RequireTenant>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
              <p className="text-muted-foreground">
                {t('dashboard.welcomeBack')}, {user?.email}!
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="deposit" asChild>
                <Link to="/deposit-list">
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  {t('dashboard.depositButton')}
                </Link>
              </Button>
              <Button variant="withdrawal" asChild>
                <Link to="/withdrawal-list">
                  <ArrowDownRight className="mr-2 h-4 w-4" />
                  {t('dashboard.withdrawalButton')}
                </Link>
              </Button>
            </div>
          </div>

          {/* Top Stats - Deposits, Withdrawals, Balance */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium opacity-90">{t('dashboard.totalDeposit')}</p>
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                {loadingCurrentDeposits ? (
                  <Skeleton className="h-10 w-32 bg-white/20" />
                ) : (
                  <>
                    <p className="text-3xl font-bold">
                      ฿{currentMonthDeposits?.total.toLocaleString() || "0.00"}
                    </p>
                    <div className="flex items-center mt-2 text-sm">
                      {depositChange >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      <span className="opacity-90">
                        {depositChange >= 0 ? "+" : ""}{depositChange.toFixed(1)}% {t('dashboard.compareLastMonth')}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-500 to-purple-600 text-white border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium opacity-90">{t('dashboard.totalWithdrawal')}</p>
                  <ArrowDownRight className="h-5 w-5" />
                </div>
                {loadingCurrentWithdrawals ? (
                  <Skeleton className="h-10 w-32 bg-white/20" />
                ) : (
                  <>
                    <p className="text-3xl font-bold">
                      ฿{currentMonthWithdrawals?.total.toLocaleString() || "0.00"}
                    </p>
                    <div className="flex items-center mt-2 text-sm">
                      {withdrawalChange >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      <span className="opacity-90">
                        {withdrawalChange >= 0 ? "+" : ""}{withdrawalChange.toFixed(1)}% {t('dashboard.compareLastMonth')}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-balance text-white border-0">
              <CardContent className="pt-6">
                <p className="text-sm font-medium opacity-90 mb-2">
                  {t('dashboard.totalBalance')}
                </p>
                <p className="text-3xl font-bold">
                  ฿{((wallet?.balance || 0) / 100).toLocaleString()}
                </p>
                <p className="text-sm opacity-90 mt-2">
                  {todayStats?.count || 0} {t('dashboard.transactions')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Middle Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-activity text-white border-0 hover:shadow-glow transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">
                      {t('dashboard.todayTransactions')}
                    </p>
                    <p className="text-2xl font-bold">{todayStats?.count || 0}</p>
                    <p className="text-xs opacity-90 mt-1">
                      {allTransactions?.deposits || 0} {t('dashboard.deposits')} / {allTransactions?.withdrawals || 0} {t('dashboard.withdrawals')}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 opacity-90" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-info text-white border-0 hover:shadow-glow transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">
                      {t('dashboard.allTransactions')}
                    </p>
                    <p className="text-2xl font-bold">
                      {(allTransactions?.deposits || 0) + (allTransactions?.withdrawals || 0)}
                    </p>
                    <p className="text-xs opacity-90 mt-1">
                      ฝาก {allTransactions?.deposits || 0} / ถอน {allTransactions?.withdrawals || 0}
                    </p>
                  </div>
                  <ArrowUpRight className="h-8 w-8 opacity-90" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 hover:shadow-glow transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">
                      {t('dashboard.depositTransactions')}
                    </p>
                    <p className="text-2xl font-bold">{depositStats?.total || 0}</p>
                    <p className="text-xs opacity-90 mt-1">
                      {t('dashboard.successful')}: {depositStats?.successful || 0}
                    </p>
                  </div>
                  <ArrowUpRight className="h-8 w-8 opacity-90" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white border-0 hover:shadow-glow transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">
                      {t('dashboard.withdrawalTransactions')}
                    </p>
                    <p className="text-2xl font-bold">{withdrawalStats?.total || 0}</p>
                    <p className="text-xs opacity-90 mt-1">
                      {t('dashboard.successful')}: {withdrawalStats?.successful || 0}
                    </p>
                  </div>
                  <ArrowDownRight className="h-8 w-8 opacity-90" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users Card */}
          <Card className="bg-gradient-users text-white border-0 hover:shadow-glow transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">
                    {t('dashboard.totalUsers')}
                  </p>
                  <p className="text-3xl font-bold">{usersCount?.count || 0}</p>
                  <p className="text-xs opacity-90 mt-1">
                    {t('dashboard.users')}
                  </p>
                </div>
                <Users className="h-10 w-10 opacity-90" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
              <CardTitle className="text-primary">{t('dashboard.recentTransactions')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRecent ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !recentTransactions || recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">{t('dashboard.noTransactionsYet')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {transaction.type === "deposit" ? (
                          <div className="p-2 bg-blue-100 rounded-full">
                            <ArrowUpRight className="h-4 w-4 text-blue-600" />
                          </div>
                        ) : (
                          <div className="p-2 bg-pink-100 rounded-full">
                            <ArrowDownRight className="h-4 w-4 text-pink-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">
                            {transaction.type === "deposit" ? "ฝากเงิน" : "ถอนเงิน"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.created_at), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${transaction.type === "deposit" ? "text-green-600" : "text-pink-600"}`}>
                          {transaction.type === "deposit" ? "+" : "-"}฿{(transaction.amount / 100).toLocaleString()}
                        </p>
                        <Badge variant={transaction.status === "succeeded" ? "default" : "secondary"} className="mt-1">
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </RequireTenant>
    </DashboardLayout>
  );
};

export default Dashboard;
