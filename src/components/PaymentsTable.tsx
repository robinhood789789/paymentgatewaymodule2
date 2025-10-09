import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, Download, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PaymentDetailsDrawer } from "./PaymentDetailsDrawer";
import { toast } from "sonner";
import { invokeFunctionWithTenant } from "@/lib/supabaseFunctions";

export const PaymentsTable = () => {
  const { activeTenantId } = useTenantSwitcher();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    status: "all",
    method: "all",
    reference: "",
    minAmount: "",
    maxAmount: "",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments", activeTenantId, filters],
    queryFn: async () => {
      if (!activeTenantId) return [];

      let query = supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", activeTenantId)
        .order("created_at", { ascending: false });

      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.method !== "all") {
        query = query.eq("method", filters.method);
      }

      if (filters.minAmount) {
        query = query.gte("amount", parseInt(filters.minAmount) * 100);
      }

      if (filters.maxAmount) {
        query = query.lte("amount", parseInt(filters.maxAmount) * 100);
      }

      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom.toISOString());
      }

      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId,
  });

  const handleExportCSV = async () => {
    try {
      const { data, error } = await invokeFunctionWithTenant("payments-export", {
        body: { filters },
      });

      if (error) throw error;

      const blob = new Blob([data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("CSV exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export CSV");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded": return "default";
      case "pending": return "secondary";
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.method} onValueChange={(v) => setFilters({ ...filters, method: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="promptpay">PromptPay</SelectItem>
              <SelectItem value="truemoney">TrueMoney</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(!filters.dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(filters.dateFrom, "PPP") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => setFilters({ ...filters, dateFrom: date })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(!filters.dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? format(filters.dateTo, "PPP") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => setFilters({ ...filters, dateTo: date })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Input
            placeholder="Min amount"
            type="number"
            value={filters.minAmount}
            onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
          />

          <Input
            placeholder="Max amount"
            type="number"
            value={filters.maxAmount}
            onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
          />

          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {!payments || payments.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-muted-foreground mb-4">No payments found</p>
            <p className="text-sm text-muted-foreground">Payments will appear here once customers complete checkout</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow
                    key={payment.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedPayment(payment);
                      setDrawerOpen(true);
                    }}
                  >
                    <TableCell className="font-medium">
                      {(payment.amount / 100).toLocaleString()} {payment.currency.toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(payment.status)}>{payment.status}</Badge>
                    </TableCell>
                    <TableCell>{payment.method || "-"}</TableCell>
                    <TableCell>{payment.provider || "-"}</TableCell>
                    <TableCell>{format(new Date(payment.created_at), "PPp")}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPayment(payment);
                          setDrawerOpen(true);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <PaymentDetailsDrawer
        payment={selectedPayment}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
};
