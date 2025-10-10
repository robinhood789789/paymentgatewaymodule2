import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, RefreshCw, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type PaymentStatus = "all" | "pending" | "processing" | "succeeded" | "expired" | "rejected";

export default function DepositList() {
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [priority, setPriority] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: deposits, isLoading, refetch } = useQuery({
    queryKey: ["deposits", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select("*")
        .eq("type", "deposit")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const statusButtons: { value: PaymentStatus; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    { value: "pending", label: "รอชำระเงิน" },
    { value: "processing", label: "กำลังชำระเงิน" },
    { value: "succeeded", label: "สำเร็จ" },
    { value: "expired", label: "หมดเวลา" },
    { value: "rejected", label: "ถูกปฏิเสธ" },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      succeeded: { label: "สำเร็จ", variant: "default" as const },
      pending: { label: "รอชำระ", variant: "secondary" as const },
      processing: { label: "กำลังดำเนินการ", variant: "default" as const },
      expired: { label: "หมดเวลา", variant: "destructive" as const },
      rejected: { label: "ถูกปฏิเสธ", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      variant: "secondary" as const 
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">รายการเติมเงิน</h1>
          <div className="flex gap-2">
            <Button variant="default" className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              เติมเงิน
            </Button>
            <Button variant="default">
              <Settings className="mr-2 h-4 w-4" />
              ตั้งค่า
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              {statusButtons.map((btn) => (
                <Button
                  key={btn.value}
                  variant={statusFilter === btn.value ? "default" : "outline"}
                  onClick={() => setStatusFilter(btn.value)}
                  size="sm"
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">เรียงตาม</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">สร้างเมื่อ</SelectItem>
                    <SelectItem value="amount">จำนวนเงิน</SelectItem>
                    <SelectItem value="status">สถานะ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="high">มาก</SelectItem>
                    <SelectItem value="medium">ปานกลาง</SelectItem>
                    <SelectItem value="low">น้อย</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Date Range</label>
                <Input type="date" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">กรองชื่อตาม</label>
                <Select defaultValue="verified">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="verified">ยืนยันแล้ว</SelectItem>
                    <SelectItem value="unverified">ยังไม่ยืนยัน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="quick search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สร้างเมื่อ</TableHead>
                    <TableHead>Ref ID</TableHead>
                    <TableHead>TX ID</TableHead>
                    <TableHead>ผู้ค้า</TableHead>
                    <TableHead>จำนวนเงิน</TableHead>
                    <TableHead>ธนาคาร</TableHead>
                    <TableHead>เลขบัญชี</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        กำลังโหลด...
                      </TableCell>
                    </TableRow>
                  ) : deposits && deposits.length > 0 ? (
                    deposits.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell>
                          {format(new Date(deposit.created_at), "yyyy-MM-dd HH:mm")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {deposit.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {deposit.provider_payment_id?.slice(0, 8) || "-"}
                        </TableCell>
                        <TableCell>{deposit.provider || "-"}</TableCell>
                        <TableCell>
                          {(deposit.amount / 100).toLocaleString()} {deposit.currency}
                        </TableCell>
                        <TableCell>{deposit.method || "-"}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{deposit.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            ดูรายละเอียด
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No transactions found
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
