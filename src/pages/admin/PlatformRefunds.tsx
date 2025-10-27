import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, AlertCircle, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Refund {
  id: string;
  payment_id: string;
  tenant_id: string;
  tenant_name: string;
  amount: number;
  currency: string;
  reason: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  created_at: string;
  processed_at?: string;
}

const PlatformRefunds = () => {
  const { user, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user || !isSuperAdmin) return;

    // Audit: Page view
    supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "platform.refunds.view",
      target_type: "platform_refunds",
      ip_address: "",
      user_agent: navigator.userAgent,
    });

    loadRefunds();
  }, [user, isSuperAdmin]);

  const loadRefunds = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual cross-tenant refunds query
      const mockRefunds: Refund[] = [
        {
          id: "ref_1",
          payment_id: "pay_123",
          tenant_id: "tenant_1",
          tenant_name: "Merchant A",
          amount: 3000,
          currency: "THB",
          reason: "customer_request",
          status: "succeeded",
          created_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
        },
        {
          id: "ref_2",
          payment_id: "pay_456",
          tenant_id: "tenant_2",
          tenant_name: "Merchant B",
          amount: 1500,
          currency: "THB",
          reason: "duplicate",
          status: "processing",
          created_at: new Date().toISOString(),
        },
      ];
      setRefunds(mockRefunds);
    } catch (error) {
      console.error("Error loading refunds:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRefunds = refunds.filter(
    (refund) =>
      refund.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.payment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.tenant_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Refund["status"]) => {
    const variants = {
      pending: "secondary",
      processing: "default",
      succeeded: "default",
      failed: "destructive",
    } as const;
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Refunds (Cross-Tenant View)</h1>
        <p className="text-muted-foreground">ติดตาม refunds จากทุก tenant (read-only)</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          📖 หน้านี้เป็น read-only view สำหรับ Super Admin เท่านั้น
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{refunds.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {refunds.filter((r) => r.status === "pending").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {refunds.filter((r) => r.status === "processing").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Succeeded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {refunds.filter((r) => r.status === "succeeded").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ค้นหา Refunds</CardTitle>
          <CardDescription>ค้นหาด้วย refund ID, payment ID, หรือ tenant name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>ค้นหา</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา refund ID, payment ID, tenant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Refunds ({filteredRefunds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Refund ID</TableHead>
                <TableHead>Payment ID</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRefunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    ไม่พบ refunds
                  </TableCell>
                </TableRow>
              ) : (
                filteredRefunds.map((refund) => (
                  <TableRow key={refund.id}>
                    <TableCell className="font-mono text-sm">{refund.id}</TableCell>
                    <TableCell className="font-mono text-sm">{refund.payment_id}</TableCell>
                    <TableCell>{refund.tenant_name}</TableCell>
                    <TableCell>
                      {refund.amount.toLocaleString()} {refund.currency}
                    </TableCell>
                    <TableCell>{refund.reason.replace("_", " ")}</TableCell>
                    <TableCell>{getStatusBadge(refund.status)}</TableCell>
                    <TableCell>{new Date(refund.created_at).toLocaleDateString("th-TH")}</TableCell>
                    <TableCell>
                      {refund.processed_at
                        ? new Date(refund.processed_at).toLocaleDateString("th-TH")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformRefunds;
