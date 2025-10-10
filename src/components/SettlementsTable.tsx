import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { SettlementDetailsDrawer } from "./SettlementDetailsDrawer";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const SettlementsTable = () => {
  const { t } = useI18n();
  const { activeTenantId } = useTenantSwitcher();
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ["settlements", activeTenantId, statusFilter, providerFilter, searchQuery],
    queryFn: async () => {
      if (!activeTenantId) return [];

      let query = supabase
        .from("settlements")
        .select("*")
        .eq("tenant_id", activeTenantId)
        .order("created_at", { ascending: false });

      // Apply filters
      if (statusFilter === "paid") {
        query = query.not("paid_out_at", "is", null);
      } else if (statusFilter === "pending") {
        query = query.is("paid_out_at", null);
      }

      if (providerFilter !== "all") {
        query = query.eq("provider", providerFilter);
      }

      if (searchQuery) {
        query = query.or(`id.ilike.%${searchQuery}%,cycle.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeTenantId,
  });

  const handleExportCSV = async () => {
    try {
      const csv = [
        ['ID', 'Provider', 'Cycle', 'Gross Amount', 'Fees', 'Net Amount', 'Status', 'Paid Out', 'Created'],
        ...settlements.map((s: any) => [
          s.id,
          s.provider,
          s.cycle,
          (s.net_amount + s.fees) / 100,
          s.fees / 100,
          s.net_amount / 100,
          s.paid_out_at ? 'Paid' : 'Pending',
          s.paid_out_at || '',
          s.created_at
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlements-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(t('settlements.exportSuccess'));
    } catch (error) {
      toast.error(t('settlements.exportError'));
    }
  };

  const handleRowClick = (settlement: any) => {
    setSelectedSettlement(settlement);
    setDrawerOpen(true);
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('settlements.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('settlements.allStatus')}</SelectItem>
            <SelectItem value="paid">{t('settlements.paid')}</SelectItem>
            <SelectItem value="pending">{t('settlements.pending')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('settlements.allProviders')}</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="opn">OPN</SelectItem>
            <SelectItem value="kbank">KBank</SelectItem>
            <SelectItem value="twoc2p">2C2P</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleExportCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          {t('settlements.export')}
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('settlements.id')}</TableHead>
              <TableHead>{t('settlements.provider')}</TableHead>
              <TableHead>{t('settlements.cycle')}</TableHead>
              <TableHead className="text-right">{t('settlements.grossAmount')}</TableHead>
              <TableHead className="text-right">{t('settlements.fees')}</TableHead>
              <TableHead className="text-right">{t('settlements.netAmount')}</TableHead>
              <TableHead>{t('settlements.status')}</TableHead>
              <TableHead>{t('settlements.created')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {t('settlements.noData')}
                </TableCell>
              </TableRow>
            ) : (
              settlements.map((settlement: any) => {
                const grossAmount = settlement.net_amount + settlement.fees;
                const isPaid = !!settlement.paid_out_at;
                
                return (
                  <TableRow
                    key={settlement.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(settlement)}
                  >
                    <TableCell className="font-mono text-xs">
                      {settlement.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">{settlement.provider}</TableCell>
                    <TableCell>{settlement.cycle}</TableCell>
                    <TableCell className="text-right">
                      {(grossAmount / 100).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      -{(settlement.fees / 100).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {(settlement.net_amount / 100).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isPaid ? "default" : "secondary"}>
                        {isPaid ? t('settlements.paid') : t('settlements.pending')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(settlement.created_at), "PP")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <SettlementDetailsDrawer
        settlement={selectedSettlement}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedSettlement(null);
        }}
      />
    </div>
  );
};
