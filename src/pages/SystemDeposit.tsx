import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import SystemDepositDialog from "@/components/SystemDepositDialog";
import { Wallet } from "lucide-react";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";

type PaymentStatus = "all" | "pending" | "completed";

export default function SystemDeposit() {
  const { t } = useI18n();
  const { activeTenantId } = useTenantSwitcher();
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Query for wallet balance
  const { data: wallet } = useQuery({
    queryKey: ["tenant-wallet", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      const { data, error } = await supabase
        .from("tenant_wallets")
        .select("*")
        .eq("tenant_id", activeTenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId,
  });

  const { data: deposits, isLoading, refetch } = useQuery({
    queryKey: ["system-deposits", statusFilter, activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      
      let query = supabase
        .from("payments")
        .select("*")
        .eq("type", "deposit")
        .eq("tenant_id", activeTenantId)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId,
  });

  const statusButtons: { value: PaymentStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: "Completed", variant: "default" as const },
      succeeded: { label: "Completed", variant: "default" as const },
      pending: { label: "Pending", variant: "secondary" as const },
      processing: { label: "Processing", variant: "default" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      variant: "secondary" as const 
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ระบบเติมเงิน</h1>
            <p className="text-muted-foreground mt-1">จัดการการเติมเงินเข้า Wallet ขององค์กร</p>
          </div>
          <SystemDepositDialog />
        </div>

        {/* Wallet Balance Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Wallet className="h-5 w-5" />
              <h3 className="font-semibold">Wallet Balance</h3>
            </div>
            <CardDescription>ยอดเงินคงเหลือในระบบ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {wallet ? (
                <>
                  ฿{(wallet.balance / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </>
              ) : (
                <span className="text-muted-foreground">Loading...</span>
              )}
            </div>
            {wallet?.updated_at && (
              <p className="text-xs text-muted-foreground mt-2">
                อัพเดทล่าสุด: {format(new Date(wallet.updated_at), "dd/MM/yyyy HH:mm")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">ประวัติการเติมเงิน</h3>
              <p className="text-sm text-muted-foreground">รายการเติมเงินทั้งหมดของกองค์กร</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {statusButtons.map((btn) => (
                <Button
                  key={btn.value}
                  variant={statusFilter === btn.value ? "default" : "ghost"}
                  onClick={() => setStatusFilter(btn.value)}
                  size="sm"
                  className={statusFilter === btn.value ? "" : "text-muted-foreground"}
                >
                  {btn.label}
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="ค้นหาด้วย Ref ID, หมายเหตุ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Button variant="outline" onClick={() => refetch()}>
                รีเฟรช
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>Ref ID</TableHead>
                    <TableHead>จำนวนเงิน</TableHead>
                    <TableHead>วิธีการชำระ</TableHead>
                    <TableHead>เลขอ้างอิง</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>วันที่ชำระ</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : deposits && deposits.length > 0 ? (
                    deposits
                      .filter((deposit) => {
                        if (!searchQuery) return true;
                        const search = searchQuery.toLowerCase();
                        return (
                          deposit.id.toLowerCase().includes(search) ||
                          (deposit.metadata as any)?.reference?.toLowerCase().includes(search) ||
                          (deposit.metadata as any)?.notes?.toLowerCase().includes(search)
                        );
                      })
                      .map((deposit) => (
                        <TableRow key={deposit.id}>
                          <TableCell className="text-sm">
                            {format(new Date(deposit.created_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {deposit.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            ฿{(deposit.amount / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-sm capitalize">
                            {deposit.method?.replace('_', ' ') || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {(deposit.metadata as any)?.reference || "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                          <TableCell className="text-sm">
                            {deposit.paid_at ? format(new Date(deposit.paid_at), "dd/MM/yyyy HH:mm") : "-"}
                          </TableCell>
                          <TableCell className="text-sm max-w-xs truncate">
                            {(deposit.metadata as any)?.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <div className="text-4xl">💰</div>
                          <div>ยังไม่มีรายการเติมเงิน</div>
                          <p className="text-xs">เริ่มเติมเงินเข้าระบบได้เลย</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
