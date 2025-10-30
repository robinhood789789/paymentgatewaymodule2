import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShareholder } from "@/hooks/useShareholder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Edit, Eye } from "lucide-react";

export default function ShareholderClients() {
  const { shareholder } = useShareholder();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [newCommissionRate, setNewCommissionRate] = useState("");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["shareholder-clients", shareholder?.id],
    queryFn: async () => {
      if (!shareholder?.id) return [];

      const { data, error } = await supabase
        .from("shareholder_clients")
        .select(`
          *,
          tenants (
            id,
            name,
            status,
            kyc_status,
            created_at
          )
        `)
        .eq("shareholder_id", shareholder.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!shareholder?.id,
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ clientId, rate }: { clientId: string; rate: number }) => {
      const { error } = await supabase
        .from("shareholder_clients")
        .update({ commission_rate: rate })
        .eq("id", clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareholder-clients"] });
      toast.success("อัพเดทเปอร์เซนต์ค่าคอมมิชชั่นสำเร็จ");
      setSelectedClient(null);
      setNewCommissionRate("");
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const handleUpdateCommission = () => {
    const rate = parseFloat(newCommissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("กรุณาใส่เปอร์เซนต์ระหว่าง 0-100");
      return;
    }

    updateCommissionMutation.mutate({
      clientId: selectedClient.id,
      rate,
    });
  };

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
        <h1 className="text-3xl font-bold">ลูกค้าของฉัน</h1>
        <p className="text-muted-foreground mt-2">
          จัดการลูกค้าและค่าคอมมิชชั่น
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายชื่อลูกค้าทั้งหมด ({clients?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อองค์กร</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>ค่าคอมมิชชั่น (%)</TableHead>
                <TableHead>วันที่แนะนำ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients && clients.length > 0 ? (
                clients.map((client: any) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.tenants?.name || "ไม่ระบุ"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.status === "active" ? "default" : "secondary"}>
                        {client.status === "active" ? "ใช้งาน" : "ไม่ใช้งาน"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.tenants?.kyc_status === "verified" ? "default" : "secondary"}>
                        {client.tenants?.kyc_status || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-primary">
                        {client.commission_rate}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(client.referred_at).toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClient(client);
                                setNewCommissionRate(client.commission_rate.toString());
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              แก้ไข
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>แก้ไขค่าคอมมิชชั่น</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>ชื่อองค์กร</Label>
                                <Input
                                  value={client.tenants?.name || ""}
                                  disabled
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>เปอร์เซนต์ค่าคอมมิชชั่น (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={newCommissionRate}
                                  onChange={(e) => setNewCommissionRate(e.target.value)}
                                  placeholder="0.00"
                                />
                                <p className="text-xs text-muted-foreground">
                                  ใส่ค่าระหว่าง 0-100
                                </p>
                              </div>
                              <Button
                                onClick={handleUpdateCommission}
                                disabled={updateCommissionMutation.isPending}
                                className="w-full"
                              >
                                {updateCommissionMutation.isPending ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    ยังไม่มีลูกค้า
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
