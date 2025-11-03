import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle2, Wallet, TrendingUp } from "lucide-react";
import { useShareholder } from "@/hooks/useShareholder";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Summary = {
  totalOwners: number;
  activeOwners: number;
  monthlyRefRevenue: number;
  pendingCommission: number;
};

type CommissionPoint = { date: string; commissionTHB: number };

async function fetchSummary(): Promise<Summary> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const response = await supabase.functions.invoke('shareholder-referral-stats', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.error) throw response.error;
  return response.data.data;
}

async function fetchCommissionSeries(range: "3M" | "6M" | "12M"): Promise<CommissionPoint[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const response = await supabase.functions.invoke('shareholder-commission-chart', {
    headers: { Authorization: `Bearer ${token}` },
    body: { range },
  });

  if (response.error) throw response.error;
  return response.data.data;
}

export default function ShareholderOverview() {
  const { toast } = useToast();
  const { shareholder, isLoading: shareholderLoading } = useShareholder();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [range, setRange] = useState<"3M" | "6M" | "12M">("6M");
  const [series, setSeries] = useState<CommissionPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareholder) return;
    
    (async () => {
      try {
        setLoading(true);
        const [s, p] = await Promise.all([
          fetchSummary(),
          fetchCommissionSeries(range),
        ]);
        setSummary(s);
        setSeries(p);
      } catch (error) {
        console.error('Error loading overview:', error);
        toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถโหลดข้อมูลได้", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [shareholder, range]);

  if (shareholderLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ภาพรวม</h1>
        <p className="text-muted-foreground">สรุปข้อมูลธุรกรรมและคอมมิชชัน</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Owner ทั้งหมด</p>
              <p className="text-2xl font-bold">{summary?.totalOwners ?? "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Owner</p>
              <p className="text-2xl font-bold">{summary?.activeOwners ?? "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">คอมมิชชัน/เดือน</p>
              <p className="text-2xl font-bold">
                {summary ? `฿${summary.monthlyRefRevenue.toLocaleString()}` : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">คอมมิชชันรอจ่าย</p>
              <p className="text-2xl font-bold">
                {summary ? `฿${summary.pendingCommission.toLocaleString()}` : "-"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>แนวโน้มคอมมิชชัน</CardTitle>
          <Select value={range} onValueChange={(v: any) => setRange(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3M">3 เดือน</SelectItem>
              <SelectItem value="6M">6 เดือน</SelectItem>
              <SelectItem value="12M">12 เดือน</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `฿${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="commissionTHB" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
