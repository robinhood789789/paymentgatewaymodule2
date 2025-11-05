import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Activity, TrendingUp, Shield, Loader2, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SuperAdminDashboard() {
  const { user, isSuperAdmin, loading } = useAuth();
  const [dateRange, setDateRange] = useState("30d");

  // Log page access
  useEffect(() => {
    if (user && isSuperAdmin) {
      supabase.from("audit_logs").insert({
        action: "super_admin.dashboard.viewed",
        actor_user_id: user.id,
        ip: null,
        user_agent: navigator.userAgent,
      });
    }
  }, [user, isSuperAdmin]);

  // Fetch platform statistics
  const { data: stats } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      const [tenantsRes, usersRes, paymentsRes] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount, status"),
      ]);

      const totalRevenue = paymentsRes.data
        ?.filter((p) => p.status === "succeeded")
        .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      return {
        totalTenants: tenantsRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalPayments: paymentsRes.data?.length || 0,
        totalRevenue,
      };
    },
    enabled: isSuperAdmin,
  });

  // Fetch recent transactions
  const { data: transactions } = useQuery({
    queryKey: ["super-admin-transactions", dateRange],
    queryFn: async () => {
      const days = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          tenants (name),
          shareholder:shareholders (full_name, email)
        `)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  // Fetch shareholder commissions
  const { data: commissions } = useQuery({
    queryKey: ["super-admin-commissions", dateRange],
    queryFn: async () => {
      const days = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("shareholder_commission_events")
        .select(`
          *,
          shareholder:shareholders (full_name, email),
          tenant:tenants (name)
        `)
        .gte("occurred_at", startDate.toISOString())
        .order("occurred_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Calculate totals
      const totalBase: number = data?.reduce((sum, c) => sum + parseFloat(String(c.base_value || 0)), 0) || 0;
      const totalCommission: number = data?.reduce((sum, c) => sum + parseFloat(String(c.commission_amount || 0)), 0) || 0;
      const netToPlatform: number = totalBase - totalCommission;
      const avgRate: string = totalBase > 0 ? ((totalCommission / totalBase) * 100).toFixed(2) : "0.00";

      return {
        events: data || [],
        summary: {
          totalBase,
          totalCommission,
          netToPlatform,
          avgRate,
        },
      };
    },
    enabled: isSuperAdmin,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Console</h1>
          <p className="text-muted-foreground">Platform management and monitoring</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
            <p className="text-xs text-muted-foreground">Active merchants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Platform users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPayments || 0}</div>
            <p className="text-xs text-muted-foreground">All time transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{((stats?.totalRevenue || 0) / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Platform revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Summary */}
      {commissions && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ยอดฐาน (Base)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ฿{commissions.summary.totalBase.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">จากธุรกรรมทั้งหมด</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission ให้ Shareholders</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ฿{commissions.summary.totalCommission.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">อัตราเฉลี่ย {commissions.summary.avgRate}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">สุทธิแพลตฟอร์ม</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ฿{commissions.summary.netToPlatform.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">หลังหัก commission</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">จำนวน Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{commissions.events.length}</div>
              <p className="text-xs text-muted-foreground">commission events</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for Transactions & Commissions */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Flow & Commissions</CardTitle>
          <CardDescription>ดูความเคลื่อนไหวธุรกรรมและการจ่าย commission</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="commissions">Shareholder Commissions</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Shareholder</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Fee</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions && transactions.length > 0 ? (
                      transactions.map((tx: any) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs">
                            {new Date(tx.created_at).toLocaleDateString('th-TH', { 
                              day: '2-digit', 
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell className="font-medium">{tx.tenants?.name || '-'}</TableCell>
                          <TableCell className="text-xs">
                            {tx.shareholder?.full_name || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{tx.type}</Badge>
                          </TableCell>
                          <TableCell>
                            {tx.direction === 'IN' ? (
                              <Badge className="gap-1" variant="default">
                                <ArrowDownRight className="h-3 w-3" /> IN
                              </Badge>
                            ) : (
                              <Badge className="gap-1" variant="secondary">
                                <ArrowUpRight className="h-3 w-3" /> OUT
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ฿{parseFloat(tx.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            ฿{parseFloat(tx.fee || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            ฿{parseFloat(tx.net_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                tx.status === 'SUCCESS' ? 'default' :
                                tx.status === 'PENDING' ? 'secondary' : 'destructive'
                              }
                            >
                              {tx.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          ไม่มีธุรกรรมในช่วงเวลานี้
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="commissions" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่</TableHead>
                      <TableHead>Shareholder</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead className="text-right">Base Value</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Net to Platform</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions && commissions.events.length > 0 ? (
                      commissions.events.map((comm: any) => {
                        const baseValue = parseFloat(comm.base_value || 0);
                        const commissionAmount = parseFloat(comm.commission_amount || 0);
                        const netToPlatform = baseValue - commissionAmount;
                        const rate = baseValue > 0 ? ((commissionAmount / baseValue) * 100).toFixed(2) : '0.00';

                        return (
                          <TableRow key={comm.id}>
                            <TableCell className="text-xs">
                              {new Date(comm.occurred_at).toLocaleDateString('th-TH', { 
                                day: '2-digit', 
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{comm.shareholder?.full_name}</div>
                              <div className="text-xs text-muted-foreground">{comm.shareholder?.email}</div>
                            </TableCell>
                            <TableCell className="font-medium">{comm.tenant?.name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{comm.event_type || 'commission'}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ฿{baseValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-primary">
                              {rate}%
                            </TableCell>
                            <TableCell className="text-right font-mono text-orange-600 font-semibold">
                              ฿{commissionAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600 font-semibold">
                              ฿{netToPlatform.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          ไม่มี commission events ในช่วงเวลานี้
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Platform management tools</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <a
              href="/admin/tenants"
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <Building2 className="h-5 w-5" />
              <div>
                <div className="font-medium">Manage Tenants</div>
                <div className="text-sm text-muted-foreground">View and configure merchants</div>
              </div>
            </a>
            <a
              href="/platform/partners"
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <Users className="h-5 w-5" />
              <div>
                <div className="font-medium">Manage Partners</div>
                <div className="text-sm text-muted-foreground">Shareholder management</div>
              </div>
            </a>
            <a
              href="/platform/security"
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <Shield className="h-5 w-5" />
              <div>
                <div className="font-medium">Platform Security</div>
                <div className="text-sm text-muted-foreground">Configure security defaults</div>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
