import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { TwoFactorChallenge } from "@/components/security/TwoFactorChallenge";

interface ProviderCredentials {
  stripe?: {
    test_public_key?: string;
    test_secret_key?: string;
    live_public_key?: string;
    live_secret_key?: string;
  };
  kbank?: {
    test_merchant_id?: string;
    test_secret_key?: string;
    live_merchant_id?: string;
    live_secret_key?: string;
  };
  opn?: {
    test_public_key?: string;
    test_secret_key?: string;
    live_public_key?: string;
    live_secret_key?: string;
  };
  twoc2p?: {
    test_merchant_id?: string;
    test_secret_key?: string;
    live_merchant_id?: string;
    live_secret_key?: string;
  };
}

export const PaymentProvidersConfig = () => {
  const { tenantId } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [mfaChallengeOpen, setMfaChallengeOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    provider: string;
    mode: string;
    credentials: any;
  } | null>(null);

  const [credentials, setCredentials] = useState<ProviderCredentials>({
    stripe: {},
    kbank: {},
    opn: {},
    twoc2p: {},
  });

  const { data: tenantConfig, isLoading } = useQuery({
    queryKey: ["tenant-config", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("metadata")
        .eq("id", tenantId)
        .single();

      if (error) throw error;

      const metadata = (data?.metadata as any) || {};
      const providerCreds = metadata.provider_credentials || {};
      
      setCredentials({
        stripe: providerCreds.stripe || {},
        kbank: providerCreds.kbank || {},
        opn: providerCreds.opn || {},
        twoc2p: providerCreds.twoc2p || {},
      });

      return data;
    },
    enabled: !!tenantId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      provider,
      mode,
      credentials,
    }: {
      provider: string;
      mode: string;
      credentials: any;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "provider-credentials-update",
        {
          body: { provider, mode, credentials },
          headers: {
            "x-tenant": tenantId!,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-config", tenantId] });
      toast.success(t("settings.credentialsUpdated"));
    },
    onError: (error: any) => {
      toast.error(t("common.error"), {
        description: error.message,
      });
    },
  });

  const handleUpdateCredentials = (
    provider: string,
    mode: "test" | "live"
  ) => {
    const providerCreds = credentials[provider as keyof ProviderCredentials];
    const creds = {
      [`${mode}_public_key`]: (providerCreds as any)?.[`${mode}_public_key`],
      [`${mode}_secret_key`]: (providerCreds as any)?.[`${mode}_secret_key`],
      [`${mode}_merchant_id`]: (providerCreds as any)?.[`${mode}_merchant_id`],
    };

    setPendingUpdate({ provider, mode, credentials: creds });
    setMfaChallengeOpen(true);
  };

  const handleMfaSuccess = () => {
    if (pendingUpdate) {
      updateMutation.mutate(pendingUpdate);
      setPendingUpdate(null);
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderCredentialFields = (
    provider: string,
    mode: "test" | "live",
    fields: string[]
  ) => {
    const providerCreds = credentials[provider as keyof ProviderCredentials] || {};

    return (
      <div className="space-y-4">
        <h4 className="font-medium capitalize">
          {mode === "test" ? t("settings.testMode") : t("settings.liveMode")}
        </h4>
        {fields.map((field) => {
          const fieldKey = `${mode}_${field}`;
          const isSecret = field.includes("secret");
          const value = (providerCreds as any)?.[fieldKey] || "";

          return (
            <div key={fieldKey} className="space-y-2">
              <Label htmlFor={`${provider}-${fieldKey}`}>
                {field.includes("public")
                  ? t("settings.publicKey")
                  : field.includes("secret")
                  ? t("settings.secretKey")
                  : t("settings.merchantId")}
              </Label>
              <div className="relative">
                <Input
                  id={`${provider}-${fieldKey}`}
                  type={isSecret && !showSecrets[fieldKey] ? "password" : "text"}
                  value={value}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      [provider]: {
                        ...(prev[provider as keyof ProviderCredentials] || {}),
                        [fieldKey]: e.target.value,
                      },
                    }))
                  }
                  placeholder={`${mode === "test" ? "Test" : "Live"} ${field.replace("_", " ")}`}
                  className={isSecret ? "pr-10" : ""}
                />
                {isSecret && (
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility(fieldKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecrets[fieldKey] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <Button
          onClick={() => handleUpdateCredentials(provider, mode)}
          disabled={updateMutation.isPending}
          variant="gradient"
          className="w-full"
        >
          {updateMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {t("settings.updateCredentials")}
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.providerCredentials")}</CardTitle>
          <CardDescription>{t("settings.manageCredentials")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stripe */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Stripe</h3>
            <Separator />
            <div className="grid gap-6 md:grid-cols-2">
              {renderCredentialFields("stripe", "test", [
                "public_key",
                "secret_key",
              ])}
              {renderCredentialFields("stripe", "live", [
                "public_key",
                "secret_key",
              ])}
            </div>
          </div>

          <Separator className="my-6" />

          {/* KBank */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">KBank</h3>
            <Separator />
            <div className="grid gap-6 md:grid-cols-2">
              {renderCredentialFields("kbank", "test", [
                "merchant_id",
                "secret_key",
              ])}
              {renderCredentialFields("kbank", "live", [
                "merchant_id",
                "secret_key",
              ])}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Omise (OPN) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Omise (OPN)</h3>
            <Separator />
            <div className="grid gap-6 md:grid-cols-2">
              {renderCredentialFields("opn", "test", [
                "public_key",
                "secret_key",
              ])}
              {renderCredentialFields("opn", "live", [
                "public_key",
                "secret_key",
              ])}
            </div>
          </div>

          <Separator className="my-6" />

          {/* 2C2P */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">2C2P</h3>
            <Separator />
            <div className="grid gap-6 md:grid-cols-2">
              {renderCredentialFields("twoc2p", "test", [
                "merchant_id",
                "secret_key",
              ])}
              {renderCredentialFields("twoc2p", "live", [
                "merchant_id",
                "secret_key",
              ])}
            </div>
          </div>
        </CardContent>
      </Card>

      <TwoFactorChallenge
        open={mfaChallengeOpen}
        onOpenChange={setMfaChallengeOpen}
        onSuccess={handleMfaSuccess}
        title={t("settings.paymentProviders")}
        description={t("settings.manageCredentials")}
      />
    </>
  );
};
