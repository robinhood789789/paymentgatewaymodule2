import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { SystemWithdrawalDialog } from "@/components/SystemWithdrawalDialog";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, ArrowDownToLine, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";

type WithdrawalStatus = "all" | "pending" | "succeeded" | "failed" | "cancelled";

export default function SystemWithdrawal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeTenantId } = useTenantSwitcher();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Check if user is owner
  useEffect(() => {
    const checkOwnerRole = async () => {
      if (!user || !activeTenantId) return;

      const { data, error } = await supabase
        .from("memberships")
        .select("role_id, roles!inner(name)")
        .eq("user_id", user.id)
        .eq("tenant_id", activeTenantId)
        .single();

      if (error || !data) {
        setIsOwner(false);
        return;
      }

      setIsOwner(data.roles.name === "owner");
    };

    checkOwnerRole();
  }, [user, activeTenantId]);

  // Fetch wallet balance
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["tenant-wallet", activeTenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_wallets")
        .select("balance")
        .eq("tenant_id", activeTenantId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId && isOwner === true,
  });

  // Fetch tenant settings
  const { data: settings } = useQuery({
    queryKey: ["tenant-settings", activeTenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("withdrawal_daily_limit, withdrawal_per_transaction_limit, withdrawal_approval_threshold")
        .eq("tenant_id", activeTenantId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId && isOwner === true,
  });

  // Fetch today's withdrawal total
  const today = new Date().toISOString().split('T')[0];
  const { data: dailyTotal } = useQuery({
    queryKey: ["withdrawal-daily-total", activeTenantId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_daily_totals")
        .select("total_amount")
        .eq("tenant_id", activeTenantId!)
        .eq("date", today)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId && isOwner === true,
  });

  // Fetch withdrawal history
  const { data: withdrawals, isLoading: withdrawalsLoading, refetch } = useQuery({
    queryKey: ["withdrawals", activeTenantId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", activeTenantId!)
        .eq("type", "withdrawal")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId && isOwner === true,
  });

  const filteredWithdrawals = withdrawals?.filter((w) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      w.id?.toLowerCase().includes(search) ||
      w.bank_name?.toLowerCase().includes(search) ||
      w.bank_account_number?.toLowerCase().includes(search) ||
      w.bank_account_name?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      succeeded: "default",
      failed: "destructive",
      cancelled: "outline",
    };
    
    const labels: Record<string, string> = {
      pending: "รอดำเนินการ",
      succeeded: "สำเร็จ",
      failed: "ล้มเหลว",
      cancelled: "ยกเลิก",
    };

    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  if (isOwner === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isOwner) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะเจ้าขององค์กรเท่านั้น
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const balance = wallet?.balance || 0;
  const dailyLimit = settings?.withdrawal_daily_limit || 1000000;
  const usedToday = dailyTotal?.total_amount || 0;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ถอนเงินระบบ</h1>
            <p className="text-muted-foreground mt-2">
              จัดการการถอนเงินออกจากกระเป๋าเงินของระบบ
            </p>
          </div>
          <SystemWithdrawalDialog
            currentBalance={balance}
            dailyLimit={dailyLimit}
            usedToday={usedToday}
          />
        </div>

        {/* Wallet Balance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              ยอดคงเหลือในกระเป๋า
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold">
                  {walletLoading ? "..." : (balance / 100).toLocaleString()} THB
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">วงเงินถอนต่อวัน</p>
                  <p className="text-lg font-semibold">{(dailyLimit / 100).toLocaleString()} THB</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ถอนไปแล้ววันนี้</p>
                  <p className="text-lg font-semibold">{(usedToday / 100).toLocaleString()} THB</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">คงเหลือถอนได้วันนี้</p>
                  <p className="text-lg font-semibold text-primary">
                    {((dailyLimit - usedToday) / 100).toLocaleString()} THB
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              ประวัติการถอนเงิน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2 flex-wrap">
                  {(["all", "pending", "succeeded", "failed"] as WithdrawalStatus[]).map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === "all" ? "ทั้งหมด" : status === "pending" ? "รอดำเนินการ" : status === "succeeded" ? "สำเร็จ" : "ล้มเหลว"}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ค้นหา ID, ธนาคาร, เลขบัญชี..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่</TableHead>
                      <TableHead>จำนวนเงิน</TableHead>
                      <TableHead>ธนาคาร</TableHead>
                      <TableHead>เลขบัญชี</TableHead>
                      <TableHead>ชื่อบัญชี</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          กำลังโหลด...
                        </TableCell>
                      </TableRow>
                    ) : filteredWithdrawals && filteredWithdrawals.length > 0 ? (
                      filteredWithdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(withdrawal.created_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {(withdrawal.amount / 100).toLocaleString()} {withdrawal.currency}
                          </TableCell>
                          <TableCell>{withdrawal.bank_name || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {withdrawal.bank_account_number || "-"}
                          </TableCell>
                          <TableCell>{withdrawal.bank_account_name || "-"}</TableCell>
                          <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {withdrawal.withdrawal_notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          ไม่พบข้อมูล
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}