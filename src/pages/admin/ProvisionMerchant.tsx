import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Building2, UserPlus, Shield, Copy, Check, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { use2FAChallenge } from "@/hooks/use2FAChallenge";
import { TwoFactorChallenge } from "@/components/security/TwoFactorChallenge";

const formSchema = z.object({
  business_name: z.string().min(2, "Business name must be at least 2 characters"),
  owner_email: z.string().email("Invalid email address"),
  owner_full_name: z.string().min(2, "Full name must be at least 2 characters"),
  business_type: z.string().min(1, "Please select a business type"),
  provider: z.string().default("stripe"),
  force_2fa: z.boolean().default(true),
  platform_fee_percent: z.number().min(0).max(100).default(2.5),
  features: z.array(z.string()).default([]),
});

export default function ProvisionMerchant() {
  const { user, isSuperAdmin, loading } = useAuth();
  const [provisionedTenant, setProvisionedTenant] = useState<any>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const { isOpen, setIsOpen, checkAndChallenge, onSuccess } = use2FAChallenge();

  // Log page access
  useEffect(() => {
    if (user && isSuperAdmin) {
      supabase.from("audit_logs").insert({
        action: "super_admin.provision.viewed",
        actor_user_id: user.id,
        ip: null,
        user_agent: navigator.userAgent,
      });
    }
  }, [user, isSuperAdmin]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      business_name: "",
      owner_email: "",
      owner_full_name: "",
      business_type: "",
      provider: "stripe",
      force_2fa: true,
      platform_fee_percent: 2.5,
      features: ["payments", "refunds", "api_access"],
    },
  });

  const { data: platformPolicy } = useQuery({
    queryKey: ["platform-security-policy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_security_policy")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  const provisionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: result, error } = await supabase.functions.invoke("create-owner-user", {
        body: {
          email: data.owner_email,
          full_name: data.owner_full_name,
          tenant_name: data.business_name,
          business_type: data.business_type,
          provider: data.provider,
          force_2fa: data.force_2fa,
          platform_fee_percent: data.platform_fee_percent,
          features: data.features,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: async (data) => {
      toast.success("Merchant provisioned successfully");
      setProvisionedTenant(data);
      
      // Log provisioning action
      await supabase.from("audit_logs").insert({
        action: "super_admin.tenant.provisioned",
        actor_user_id: user?.id,
        target: data.tenant?.id,
        ip: null,
        user_agent: navigator.userAgent,
        after: {
          tenant_id: data.tenant?.id,
          tenant_name: data.tenant?.name,
          owner_email: data.user?.email,
        },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to provision merchant");
    },
  });

  const handleProvision = (data: z.infer<typeof formSchema>) => {
    checkAndChallenge(() => provisionMutation.mutate(data));
  };

  const handleCopyPassword = () => {
    if (provisionedTenant?.temporary_password) {
      navigator.clipboard.writeText(provisionedTenant.temporary_password);
      setCopiedPassword(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const handleReset = () => {
    setProvisionedTenant(null);
    form.reset();
  };

  const availableFeatures = [
    { id: "payments", label: "Payment Processing" },
    { id: "refunds", label: "Refund Management" },
    { id: "api_access", label: "API Access" },
    { id: "webhooks", label: "Webhook Integration" },
    { id: "advanced_reporting", label: "Advanced Reporting" },
    { id: "multi_currency", label: "Multi-Currency Support" },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (provisionedTenant) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-green-600" />
              Merchant Provisioned
            </h1>
            <p className="text-muted-foreground">Merchant setup completed successfully</p>
          </div>

          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="text-green-600">✓ Success</CardTitle>
              <CardDescription>
                Merchant account and workspace have been created
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Save these credentials securely. The temporary password will not be shown again.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Tenant/Workspace</div>
                  <div className="text-lg font-semibold">{provisionedTenant.tenant.name}</div>
                  <div className="text-xs text-muted-foreground">ID: {provisionedTenant.tenant.id}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Owner Email</div>
                  <div className="text-lg font-semibold">{provisionedTenant.user.email}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Owner Name</div>
                  <div className="text-lg font-semibold">{provisionedTenant.user.full_name}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Temporary Password</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
                      {provisionedTenant.temporary_password}
                    </code>
                    <Button size="sm" variant="outline" onClick={handleCopyPassword}>
                      {copiedPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    User will be forced to change password on first login
                  </div>
                </div>

                <div className="flex gap-2">
                  <Badge variant="secondary">
                    2FA: {provisionedTenant.force_2fa ? "Enforced" : "Optional"}
                  </Badge>
                  <Badge variant="outline">
                    Provider: {provisionedTenant.tenant.provider || "stripe"}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleReset} className="flex-1">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Provision Another Merchant
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Provision New Merchant
          </h1>
          <p className="text-muted-foreground">
            Create a new merchant tenant with owner account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Merchant Setup Wizard</CardTitle>
            <CardDescription>
              Configure the new merchant workspace and owner account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleProvision)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Business Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="business_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corporation" {...field} />
                        </FormControl>
                        <FormDescription>
                          This will be the tenant/workspace name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="business_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select business type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="ecommerce">E-commerce</SelectItem>
                            <SelectItem value="saas">SaaS</SelectItem>
                            <SelectItem value="marketplace">Marketplace</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold">Owner Account</h3>
                  
                  <FormField
                    control={form.control}
                    name="owner_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="owner@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="owner_full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold">Configuration</h3>

                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Provider</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="stripe">Stripe</SelectItem>
                            <SelectItem value="opn">Omise (OPN)</SelectItem>
                            <SelectItem value="2c2p">2C2P</SelectItem>
                            <SelectItem value="kbank">K-Bank</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="platform_fee_percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform Fee (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Platform commission percentage (0-100%)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="force_2fa"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Enforce 2FA for Owner
                          </FormLabel>
                          <FormDescription>
                            Require owner to set up 2FA on first login (recommended)
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="features"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Enabled Features</FormLabel>
                          <FormDescription>
                            Select features available to this tenant
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {availableFeatures.map((feature) => (
                            <FormField
                              key={feature.id}
                              control={form.control}
                              name="features"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={feature.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(feature.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, feature.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== feature.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {feature.label}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Security Notice:</strong> This action requires 2FA verification and will be audited. 
                    {platformPolicy && ` Platform policy: ${platformPolicy.default_require_2fa_for_owner ? '2FA enforced for all owners' : '2FA optional'}`}
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={provisionMutation.isPending}>
                    {provisionMutation.isPending ? "Provisioning..." : "Provision Merchant"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <TwoFactorChallenge
        open={isOpen}
        onOpenChange={setIsOpen}
        onSuccess={onSuccess}
        title="Verify 2FA to Provision Merchant"
        description="Enter your 6-digit code from your authenticator app"
      />
    </DashboardLayout>
  );
}
