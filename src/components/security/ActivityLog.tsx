import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Filter } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  actor_user_id: string | null;
  target: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  before: any;
  after: any;
}

export function ActivityLog({ tenantId }: { tenantId: string }) {
  const { t, formatDate } = useI18n();
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [actorFilter, setActorFilter] = useState<string>('');

  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs', tenantId, actionFilter, dateFilter, actorFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (actorFilter) {
        query = query.eq('actor_user_id', actorFilter);
      }

      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);
        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('create')) return 'default';
    if (action.includes('update')) return 'secondary';
    if (action.includes('delete')) return 'destructive';
    return 'outline';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Log
        </CardTitle>
        <CardDescription>
          View and filter all activities in your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="payment:create">Payment Created</SelectItem>
                <SelectItem value="payment:update">Payment Updated</SelectItem>
                <SelectItem value="refund:create">Refund Created</SelectItem>
                <SelectItem value="link:create">Link Created</SelectItem>
                <SelectItem value="user:invite">User Invited</SelectItem>
                <SelectItem value="settings:update">Settings Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Actor ID</Label>
            <Input
              placeholder="Filter by user ID"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.target?.slice(0, 8) || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.actor_user_id?.slice(0, 8) || 'System'}
                    </TableCell>
                    <TableCell className="text-sm">{log.ip || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(new Date(log.created_at), 'datetime')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No activities found</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
