import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, AlertCircle, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { use2FAChallenge } from "@/hooks/use2FAChallenge";
import { TwoFactorChallenge } from "@/components/security/TwoFactorChallenge";

interface ProviderCredentials {
  provider: string;
  test_mode: boolean;
  api_key?: string;
  secret_key?: string;
  public_key?: string;
  merchant_id?: string;
  webhook_secret?: string;
}

export const PaymentProvidersConfig = () => {
  const { t } = useI18n();
  const { activeTenantId } = useTenantSwitcher();
  const queryClient = useQueryClient();
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const { isOpen, setIsOpen, checkAndChallenge, onSuccess } = use2FAChallenge();

  const [stripeCredentials, setStripeCredentials] = useState<ProviderCredentials>({
    provider: "stripe",
    test_mode: true,
    api_key: "",
    webhook_secret: "",
  });

  const [kbankCredentials, setKbankCredentials] = useState<ProviderCredentials>({
    provider: "kbank",
    test_mode: true,
    merchant_id: "",
    api_key: "",
    secret_key: "",
  });

  const [opnCredentials, setOpnCredentials] = useState<ProviderCredentials>({
    provider: "opn",
    test_mode: true,
    public_key: "",
    secret_key: "",
  });

  const [twoc2pCredentials, setTwoc2pCredentials] = useState<ProviderCredentials>({
    provider: "twoc2p",
    test_mode: true,
    merchant_id: "",
    secret_key: "",
  });

  // Fetch existing credentials (masked)
  const { data: existingCredentials } = useQuery({
    queryKey: ["payment-provider-credentials", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("features")
        .eq("tenant_id", activeTenantId)
        .maybeSingle();

      if (error) throw error;
      
      const features = data?.features as any;
      return features?.payment_providers || {};
    },
    enabled: !!activeTenantId,
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: async (credentials: ProviderCredentials) => {
      if (!activeTenantId) throw new Error("No active tenant");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("provider-credentials-update", {
        body: { 
          tenant_id: activeTenantId,
          credentials 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-provider-credentials"] });
      toast.success(t('settings.credentialsSaved'));
    },
    onError: (error: any) => {
      toast.error(t('settings.credentialsError'), {
        description: error.message,
      });
    },
  });

  const handleSaveCredentials = (credentials: ProviderCredentials) => {
    checkAndChallenge(() => updateCredentialsMutation.mutate(credentials));
  };

  const toggleShowSecret = (fieldId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const maskValue = (value: string) => {
    if (!value || value.length < 8) return value;
    return `${value.substring(0, 4)}${"*".repeat(value.length - 8)}${value.substring(value.length - 4)}`;
  };

  return (
    <>
      <TwoFactorChallenge 
        open={isOpen} 
        onOpenChange={setIsOpen} 
        onSuccess={onSuccess}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t('settings.paymentProviders')}
          </CardTitle>
          <CardDescription>
            {t('settings.configureProvider')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              ข้อมูลทั้งหมดจะถูกเข้ารหัสและจัดเก็บอย่างปลอดภัย เฉพาะ Owner เท่านั้นที่สามารถดูและแก้ไขได้
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="stripe" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="stripe">Stripe</TabsTrigger>
              <TabsTrigger value="kbank">KBank</TabsTrigger>
              <TabsTrigger value="opn">OPN</TabsTrigger>
              <TabsTrigger value="twoc2p">2C2P</TabsTrigger>
            </TabsList>

            {/* Stripe */}
            <TabsContent value="stripe" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stripe-test-mode">{t('settings.testMode')}</Label>
                  <Switch
                    id="stripe-test-mode"
                    checked={stripeCredentials.test_mode}
                    onCheckedChange={(checked) =>
                      setStripeCredentials(prev => ({ ...prev, test_mode: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe-api-key">{t('settings.secretKey')}</Label>
                  <div className="relative">
                    <Input
                      id="stripe-api-key"
                      type={showSecrets['stripe-api-key'] ? "text" : "password"}
                      placeholder="sk_test_..."
                      value={stripeCredentials.api_key}
                      onChange={(e) =>
                        setStripeCredentials(prev => ({ ...prev, api_key: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => toggleShowSecret('stripe-api-key')}
                    >
                      {showSecrets['stripe-api-key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe-webhook">{t('settings.webhookSecret')}</Label>
                  <div className="relative">
                    <Input
                      id="stripe-webhook"
                      type={showSecrets['stripe-webhook'] ? "text" : "password"}
                      placeholder="whsec_..."
                      value={stripeCredentials.webhook_secret}
                      onChange={(e) =>
                        setStripeCredentials(prev => ({ ...prev, webhook_secret: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => toggleShowSecret('stripe-webhook')}
                    >
                      {showSecrets['stripe-webhook'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={() => handleSaveCredentials(stripeCredentials)}
                  disabled={updateCredentialsMutation.isPending}
                >
                  {updateCredentialsMutation.isPending ? "กำลังบันทึก..." : t('settings.saveCredentials')}
                </Button>
              </div>
            </TabsContent>

            {/* KBank */}
            <TabsContent value="kbank" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="kbank-test-mode">{t('settings.testMode')}</Label>
                  <Switch
                    id="kbank-test-mode"
                    checked={kbankCredentials.test_mode}
                    onCheckedChange={(checked) =>
                      setKbankCredentials(prev => ({ ...prev, test_mode: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kbank-merchant-id">{t('settings.merchantId')}</Label>
                  <Input
                    id="kbank-merchant-id"
                    placeholder="Merchant ID"
                    value={kbankCredentials.merchant_id}
                    onChange={(e) =>
                      setKbankCredentials(prev => ({ ...prev, merchant_id: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kbank-api-key">{t('settings.apiKey')}</Label>
                  <div className="relative">
                    <Input
                      id="kbank-api-key"
                      type={showSecrets['kbank-api-key'] ? "text" : "password"}
                      placeholder="API Key"
                      value={kbankCredentials.api_key}
                      onChange={(e) =>
                        setKbankCredentials(prev => ({ ...prev, api_key: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => toggleShowSecret('kbank-api-key')}
                    >
                      {showSecrets['kbank-api-key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kbank-secret-key">{t('settings.secretKey')}</Label>
                  <div className="relative">
                    <Input
                      id="kbank-secret-key"
                      type={showSecrets['kbank-secret-key'] ? "text" : "password"}
                      placeholder="Secret Key"
                      value={kbankCredentials.secret_key}
                      onChange={(e) =>
                        setKbankCredentials(prev => ({ ...prev, secret_key: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => toggleShowSecret('kbank-secret-key')}
                    >
                      {showSecrets['kbank-secret-key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={() => handleSaveCredentials(kbankCredentials)}
                  disabled={updateCredentialsMutation.isPending}
                >
                  {updateCredentialsMutation.isPending ? "กำลังบันทึก..." : t('settings.saveCredentials')}
                </Button>
              </div>
            </TabsContent>

            {/* OPN */}
            <TabsContent value="opn" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="opn-test-mode">{t('settings.testMode')}</Label>
                  <Switch
                    id="opn-test-mode"
                    checked={opnCredentials.test_mode}
                    onCheckedChange={(checked) =>
                      setOpnCredentials(prev => ({ ...prev, test_mode: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opn-public-key">{t('settings.publicKey')}</Label>
                  <Input
                    id="opn-public-key"
                    placeholder="pkey_test_..."
                    value={opnCredentials.public_key}
                    onChange={(e) =>
                      setOpnCredentials(prev => ({ ...prev, public_key: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opn-secret-key">{t('settings.secretKey')}</Label>
                  <div className="relative">
                    <Input
                      id="opn-secret-key"
                      type={showSecrets['opn-secret-key'] ? "text" : "password"}
                      placeholder="skey_test_..."
                      value={opnCredentials.secret_key}
                      onChange={(e) =>
                        setOpnCredentials(prev => ({ ...prev, secret_key: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => toggleShowSecret('opn-secret-key')}
                    >
                      {showSecrets['opn-secret-key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={() => handleSaveCredentials(opnCredentials)}
                  disabled={updateCredentialsMutation.isPending}
                >
                  {updateCredentialsMutation.isPending ? "กำลังบันทึก..." : t('settings.saveCredentials')}
                </Button>
              </div>
            </TabsContent>

            {/* 2C2P */}
            <TabsContent value="twoc2p" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="twoc2p-test-mode">{t('settings.testMode')}</Label>
                  <Switch
                    id="twoc2p-test-mode"
                    checked={twoc2pCredentials.test_mode}
                    onCheckedChange={(checked) =>
                      setTwoc2pCredentials(prev => ({ ...prev, test_mode: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twoc2p-merchant-id">{t('settings.merchantId')}</Label>
                  <Input
                    id="twoc2p-merchant-id"
                    placeholder="Merchant ID"
                    value={twoc2pCredentials.merchant_id}
                    onChange={(e) =>
                      setTwoc2pCredentials(prev => ({ ...prev, merchant_id: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twoc2p-secret-key">{t('settings.secretKey')}</Label>
                  <div className="relative">
                    <Input
                      id="twoc2p-secret-key"
                      type={showSecrets['twoc2p-secret-key'] ? "text" : "password"}
                      placeholder="Secret Key"
                      value={twoc2pCredentials.secret_key}
                      onChange={(e) =>
                        setTwoc2pCredentials(prev => ({ ...prev, secret_key: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => toggleShowSecret('twoc2p-secret-key')}
                    >
                      {showSecrets['twoc2p-secret-key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={() => handleSaveCredentials(twoc2pCredentials)}
                  disabled={updateCredentialsMutation.isPending}
                >
                  {updateCredentialsMutation.isPending ? "กำลังบันทึก..." : t('settings.saveCredentials')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
};
