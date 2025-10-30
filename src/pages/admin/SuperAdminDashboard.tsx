import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Activity, TrendingUp, Shield, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export default function SuperAdminDashboard() {
  const { user, isSuperAdmin, loading } = useAuth();

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
      <div>
        <h1 className="text-3xl font-bold">Super Admin Console</h1>
        <p className="text-muted-foreground">Platform management and monitoring</p>
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
              href="/admin/users"
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <Users className="h-5 w-5" />
              <div>
                <div className="font-medium">Manage Users</div>
                <div className="text-sm text-muted-foreground">Platform user management</div>
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
