import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type PaymentStatus = "all" | "pending" | "completed";

export default function SystemDeposit() {
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: deposits, isLoading } = useQuery({
    queryKey: ["system-deposits", statusFilter],
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">System Deposit</h1>
        </div>

        <Card>
          <CardHeader className="space-y-4">
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

            <div>
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          
          <CardContent>
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Create At</TableHead>
                    <TableHead>Ref ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>System Bank</TableHead>
                    <TableHead>System Account Number</TableHead>
                    <TableHead>System Account Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Transfer Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : deposits && deposits.length > 0 ? (
                    deposits.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell className="text-sm">
                          {format(new Date(deposit.created_at), "MM/dd/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {deposit.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">-</TableCell>
                        <TableCell className="text-sm">{deposit.provider || "-"}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {(deposit.amount / 100).toLocaleString()} {deposit.currency}
                        </TableCell>
                        <TableCell className="text-sm">{deposit.method || "-"}</TableCell>
                        <TableCell className="text-sm">-</TableCell>
                        <TableCell className="text-sm">-</TableCell>
                        <TableCell className="text-sm">-</TableCell>
                        <TableCell className="text-sm">-</TableCell>
                        <TableCell className="text-sm">-</TableCell>
                        <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                        <TableCell className="text-sm">{deposit.method || "-"}</TableCell>
                        <TableCell className="text-sm">
                          {deposit.paid_at ? format(new Date(deposit.paid_at), "MM/dd/yyyy HH:mm") : "-"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <div className="text-4xl">📋</div>
                          <div>No data</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
