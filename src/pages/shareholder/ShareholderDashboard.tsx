import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShareholder } from "@/hooks/useShareholder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ShareholderDashboard() {
  const { shareholder } = useShareholder();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["shareholder-stats", shareholder?.id],
    queryFn: async () => {
      if (!shareholder?.id) return null;

      // Get clients count
      const { count: clientsCount } = await supabase
        .from("shareholder_clients")
        .select("*", { count: "exact", head: true })
        .eq("shareholder_id", shareholder.id)
        .eq("status", "active");

      // Get total earnings this month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data: monthlyEarnings } = await supabase
        .from("shareholder_earnings")
        .select("amount")
        .eq("shareholder_id", shareholder.id)
        .gte("created_at", firstDayOfMonth.toISOString());

      const monthlyTotal = monthlyEarnings?.reduce((sum, e) => sum + e.amount, 0) || 0;

      // Get pending earnings
      const { data: pendingEarnings } = await supabase
        .from("shareholder_earnings")
        .select("amount")
        .eq("shareholder_id", shareholder.id)
        .eq("status", "pending");

      const pendingTotal = pendingEarnings?.reduce((sum, e) => sum + e.amount, 0) || 0;

      return {
        clientsCount: clientsCount || 0,
        monthlyEarnings: monthlyTotal,
        pendingEarnings: pendingTotal,
        balance: shareholder.balance,
        totalEarnings: shareholder.total_earnings,
      };
    },
    enabled: !!shareholder?.id,
  });

  const statsCards = [
    {
      title: "ยอดเงินคงเหลือ",
      value: formatCurrency(stats?.balance || 0),
      icon: Wallet,
      description: "เงินที่สามารถถอนได้",
    },
    {
      title: "จำนวนลูกค้า",
      value: stats?.clientsCount || 0,
      icon: Users,
      description: "ลูกค้าที่ใช้งานอยู่",
    },
    {
      title: "รายได้เดือนนี้",
      value: formatCurrency(stats?.monthlyEarnings || 0),
      icon: TrendingUp,
      description: "รายได้ในเดือนปัจจุบัน",
    },
    {
      title: "รายได้รอจ่าย",
      value: formatCurrency(stats?.pendingEarnings || 0),
      icon: DollarSign,
      description: "รายได้ที่รอการจ่าย",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shareholder Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          ยินดีต้อนรับ {shareholder?.full_name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลบัญชี</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">ชื่อ-นามสกุล</dt>
              <dd className="text-sm font-medium">{shareholder?.full_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">อีเมล</dt>
              <dd className="text-sm font-medium">{shareholder?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">เบอร์โทร</dt>
              <dd className="text-sm font-medium">{shareholder?.phone || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">รายได้ทั้งหมด</dt>
              <dd className="text-sm font-medium">{formatCurrency(shareholder?.total_earnings || 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">สถานะ</dt>
              <dd className="text-sm font-medium">
                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-50 text-green-700">
                  {shareholder?.status === "active" ? "ใช้งานอยู่" : shareholder?.status}
                </span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
