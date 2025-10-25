import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { use2FAChallenge } from "@/hooks/use2FAChallenge";
import { TwoFactorChallenge } from "../security/TwoFactorChallenge";

const PROVIDERS = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'opn', label: 'OPN' },
  { value: 'twoc2p', label: '2C2P' },
  { value: 'kbank', label: 'KBank' },
];

export const ProviderCredentialsManager = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedMode, setSelectedMode] = useState<'test' | 'live'>('test');
  const [credentials, setCredentials] = useState({
    public_key: '',
    secret_key: '',
    merchant_id: '',
    webhook_secret: '',
  });
  
  const queryClient = useQueryClient();
  const { isOpen, setIsOpen, checkAndChallenge, onSuccess } = use2FAChallenge();

  const { data: platformCredentials, isLoading } = useQuery({
    queryKey: ['platform-credentials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_provider_credentials')
        .select('*')
        .order('provider', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: async ({ provider, mode, creds }: { provider: string; mode: string; creds: typeof credentials }) => {
      const { data, error } = await supabase.functions.invoke('platform-credentials-update', {
        body: { provider, mode, credentials: creds },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-credentials'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Platform credentials updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update credentials', {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    if (!selectedProvider) {
      toast.error('Please select a provider');
      return;
    }

    checkAndChallenge(() => 
      updateCredentialsMutation.mutate({
        provider: selectedProvider,
        mode: selectedMode,
        creds: credentials,
      })
    );
  };

  const resetForm = () => {
    setSelectedProvider('');
    setSelectedMode('test');
    setCredentials({
      public_key: '',
      secret_key: '',
      merchant_id: '',
      webhook_secret: '',
    });
  };

  const handleEdit = (cred: any) => {
    setSelectedProvider(cred.provider);
    setSelectedMode(cred.mode);
    // Don't populate sensitive fields for security
    setCredentials({
      public_key: '',
      secret_key: '',
      merchant_id: cred.merchant_id || '',
      webhook_secret: '',
    });
    setDialogOpen(true);
  };

  const maskValue = (value: string | null) => {
    if (!value) return 'Not set';
    return value.substring(0, 8) + '***';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Platform Provider Credentials
              </CardTitle>
              <CardDescription>
                Configure platform-level payment provider credentials (Super Admin only)
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={resetForm}>
                  <Plus className="w-4 h-4" />
                  Add/Update Credentials
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Platform Provider Credentials</DialogTitle>
                  <DialogDescription>
                    Configure credentials for a payment provider. These will be used for all tenants assigned to this provider.
                  </DialogDescription>
                </DialogHeader>

                <div className="p-4 bg-warning/10 border border-warning rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-warning">Security Warning</p>
                      <p className="text-muted-foreground mt-1">
                        These credentials are sensitive. They will be stored encrypted and require MFA to update.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Provider</Label>
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
                      <Label>Mode</Label>
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

                  <div className="space-y-2">
                    <Label>Public Key</Label>
                    <Input
                      placeholder="pk_..."
                      value={credentials.public_key}
                      onChange={(e) => setCredentials({ ...credentials, public_key: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Secret Key</Label>
                    <Input
                      type="password"
                      placeholder="sk_..."
                      value={credentials.secret_key}
                      onChange={(e) => setCredentials({ ...credentials, secret_key: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Merchant ID (if applicable)</Label>
                    <Input
                      placeholder="merchant_..."
                      value={credentials.merchant_id}
                      onChange={(e) => setCredentials({ ...credentials, merchant_id: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Secret</Label>
                    <Input
                      type="password"
                      placeholder="whsec_..."
                      value={credentials.webhook_secret}
                      onChange={(e) => setCredentials({ ...credentials, webhook_secret: e.target.value })}
                    />
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={updateCredentialsMutation.isPending}
                    className="w-full"
                  >
                    {updateCredentialsMutation.isPending ? 'Saving...' : 'Save Credentials'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : platformCredentials && platformCredentials.length > 0 ? (
            <div className="space-y-3">
              {platformCredentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {PROVIDERS.find(p => p.value === cred.provider)?.label || cred.provider}
                      </p>
                      <Badge variant={cred.mode === 'live' ? 'default' : 'secondary'}>
                        {cred.mode}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Public Key:</span> {maskValue(cred.public_key)}
                      </div>
                      <div>
                        <span className="font-medium">Secret Key:</span> {maskValue(cred.secret_key)}
                      </div>
                      {cred.merchant_id && (
                        <div>
                          <span className="font-medium">Merchant ID:</span> {cred.merchant_id}
                        </div>
                      )}
                      {cred.last_rotated_at && (
                        <div>
                          <span className="font-medium">Last Rotated:</span>{' '}
                          {new Date(cred.last_rotated_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(cred)}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Update
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No platform credentials configured yet</p>
              <p className="text-sm mt-1">Add credentials to enable payment processing</p>
            </div>
          )}
        </CardContent>
      </Card>
      <TwoFactorChallenge open={isOpen} onOpenChange={setIsOpen} onSuccess={onSuccess} />
    </>
  );
};