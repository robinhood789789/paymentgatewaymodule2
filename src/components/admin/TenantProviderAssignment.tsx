import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Check } from "lucide-react";
import { toast } from "sonner";
import { use2FAChallenge } from "@/hooks/use2FAChallenge";
import { TwoFactorChallenge } from "../security/TwoFactorChallenge";

const PROVIDERS = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'opn', label: 'OPN' },
  { value: 'twoc2p', label: '2C2P' },
  { value: 'kbank', label: 'KBank' },
];

export const TenantProviderAssignment = () => {
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedMode, setSelectedMode] = useState<'test' | 'live'>('test');
  
  const queryClient = useQueryClient();
  const { isOpen, setIsOpen, checkAndChallenge, onSuccess } = use2FAChallenge();

  const { data: tenants } = useQuery({
    queryKey: ['all-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, status')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ['tenant-provider-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_provider_assignments')
        .select('*, tenants(name)')
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const assignProviderMutation = useMutation({
    mutationFn: async ({ tenantId, provider, mode }: { tenantId: string; provider: string; mode: string }) => {
      const { data, error } = await supabase.functions.invoke('tenant-provider-assign', {
        body: { tenant_id: tenantId, provider, mode },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-provider-assignments'] });
      setSelectedTenant('');
      setSelectedProvider('');
      toast.success('Provider assigned successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to assign provider', {
        description: error.message,
      });
    },
  });

  const handleAssign = () => {
    if (!selectedTenant || !selectedProvider) {
      toast.error('Please select both tenant and provider');
      return;
    }

    checkAndChallenge(() => 
      assignProviderMutation.mutate({
        tenantId: selectedTenant,
        provider: selectedProvider,
        mode: selectedMode,
      })
    );
  };

  const getAssignmentForTenant = (tenantId: string) => {
    return assignments?.find(a => a.tenant_id === tenantId);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Tenant Provider Assignments
          </CardTitle>
          <CardDescription>
            Assign payment providers to tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Assignment Form */}
            <div className="p-4 border rounded-lg space-y-4">
              <h3 className="font-medium">Assign Provider to Tenant</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tenant</label>
                  <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider</label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Mode</label>
                  <Select value={selectedMode} onValueChange={(v: 'test' | 'live') => setSelectedMode(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleAssign}
                disabled={assignProviderMutation.isPending}
                className="w-full gap-2"
              >
                <Check className="w-4 h-4" />
                {assignProviderMutation.isPending ? 'Assigning...' : 'Assign Provider'}
              </Button>
            </div>

            {/* Current Assignments */}
            <div className="space-y-3">
              <h3 className="font-medium">Current Assignments</h3>
              {assignments && assignments.length > 0 ? (
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{assignment.tenants?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {PROVIDERS.find(p => p.value === assignment.provider)?.label}
                        </Badge>
                        <Badge variant={assignment.mode === 'live' ? 'default' : 'secondary'}>
                          {assignment.mode}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No provider assignments yet
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <TwoFactorChallenge open={isOpen} onOpenChange={setIsOpen} onSuccess={onSuccess} />
    </>
  );
};