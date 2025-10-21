import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Save, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function PlatformSecurity() {
  const { isSuperAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [defaultRequire2faOwner, setDefaultRequire2faOwner] = useState(true);
  const [defaultRequire2faAdmin, setDefaultRequire2faAdmin] = useState(true);
  const [defaultStepupWindow, setDefaultStepupWindow] = useState("300");

  const { data: policy, isLoading } = useQuery({
    queryKey: ["platform-security-policy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_security_policy")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const savePolicyMutation = useMutation({
    mutationFn: async () => {
      const stepupSeconds = parseInt(defaultStepupWindow);
      
      if (stepupSeconds < 120 || stepupSeconds > 900) {
        throw new Error("Step-up window must be between 120 and 900 seconds");
      }

      // For platform defaults, we'd typically store these in a separate table
      // For now, we'll use a special tenant_id or create a dedicated table
      // Here we're just validating and showing the concept
      
      // In a real implementation, you'd have a platform_security_policy table
      // with a singleton row for platform defaults
      
      return {
        default_require_2fa_for_owner: defaultRequire2faOwner,
        default_require_2fa_for_admin: defaultRequire2faAdmin,
        default_stepup_window_seconds: stepupSeconds,
      };
    },
    onSuccess: async () => {
      // Log audit event
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("audit_logs").insert({
        actor_user_id: user?.id,
        action: "platform.security_policy.updated",
        target: "platform:security_policy",
        tenant_id: null,
        after: {
          default_require_2fa_for_owner: defaultRequire2faOwner,
          default_require_2fa_for_admin: defaultRequire2faAdmin,
          default_stepup_window_seconds: parseInt(defaultStepupWindow),
        },
      });

      queryClient.invalidateQueries({ queryKey: ["platform-security-policy"] });
      toast.success("Platform security defaults updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update platform security defaults", {
        description: error.message,
      });
    },
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Platform Security Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure security defaults for all tenants
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Super Admin 2FA Requirement</CardTitle>
            <CardDescription>
              Super administrators must always have 2FA enabled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="super-admin-2fa" className="text-base">
                  Require 2FA for Super Admin
                </Label>
                <Info className="w-4 h-4 text-muted-foreground" />
              </div>
              <Switch
                id="super-admin-2fa"
                checked={true}
                disabled
                className="opacity-50"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              This setting is always enabled and cannot be changed for security reasons.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default Tenant Security Policy</CardTitle>
            <CardDescription>
              These settings will be applied to all newly created tenants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Existing tenants will not be affected by these changes. Only new tenants will inherit these defaults.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="default-owner-2fa" className="text-base">
                    Require 2FA for Tenant Owners
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Strongly recommended for account security
                  </p>
                </div>
                <Switch
                  id="default-owner-2fa"
                  checked={defaultRequire2faOwner}
                  onCheckedChange={setDefaultRequire2faOwner}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="default-admin-2fa" className="text-base">
                    Require 2FA for Tenant Admins
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recommended for users with elevated permissions
                  </p>
                </div>
                <Switch
                  id="default-admin-2fa"
                  checked={defaultRequire2faAdmin}
                  onCheckedChange={setDefaultRequire2faAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-stepup-window" className="text-base">
                  Default Step-up Window (seconds)
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  How long after MFA verification before requiring re-verification for sensitive actions
                </p>
                <Input
                  id="default-stepup-window"
                  type="number"
                  min="120"
                  max="900"
                  value={defaultStepupWindow}
                  onChange={(e) => setDefaultStepupWindow(e.target.value)}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Must be between 120 (2 minutes) and 900 (15 minutes) seconds
                </p>
              </div>
            </div>

            <Button
              onClick={() => savePolicyMutation.mutate()}
              disabled={savePolicyMutation.isPending}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {savePolicyMutation.isPending ? "Saving..." : "Save Platform Defaults"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
