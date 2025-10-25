import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Shield, Key, Webhook, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { OrganizationSetup } from "@/components/OrganizationSetup";
import { ApiKeysManager } from "@/components/settings/ApiKeysManager";
import { WebhooksManager } from "@/components/settings/WebhooksManager";
import { TwoFactorSetup } from "@/components/security/TwoFactorSetup";
import { TenantSecurityPolicy } from "@/components/settings/TenantSecurityPolicy";
import { ProviderDisplay } from "@/components/settings/ProviderDisplay";

const Settings = () => {
  const { user, tenantId } = useAuth();
  const location = useLocation();
  const [isUpdating, setIsUpdating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [defaultTab, setDefaultTab] = useState("profile");

  // Handle location state for redirects (e.g., from MFA guard)
  useEffect(() => {
    const state = location.state as any;
    if (state?.tab) {
      setDefaultTab(state.tab);
    }
    if (state?.message) {
      toast.info(state.message);
    }
  }, [location.state]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setFullName(data?.full_name || "");
      return data;
    },
    enabled: !!user?.id,
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user?.id);

      if (error) throw error;

      toast.success("อัพเดทโปรไฟล์สำเร็จ!");
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", {
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ตั้งค่า</h1>
          <p className="text-muted-foreground">จัดการข้อมูลส่วนตัวและความปลอดภัย</p>
        </div>

        {!tenantId && (
          <div className="mb-6">
            <OrganizationSetup />
          </div>
        )}

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="provider" className="gap-2">
              <Building2 className="w-4 h-4" />
              Provider
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="w-4 h-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="w-4 h-4" />
              Webhooks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลโปรไฟล์</CardTitle>
                <CardDescription>อัพเดทข้อมูลส่วนตัวของคุณ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {profile?.full_name ? getInitials(profile.full_name) : <User className="w-8 h-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile?.full_name || "ยังไม่ได้ตั้งชื่อ"}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <Separator />

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="นายสมชาย ใจดี"
                        className="pl-10"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10"
                        value={user?.email || ""}
                        disabled
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ไม่สามารถเปลี่ยนอีเมลได้ในขณะนี้
                    </p>
                  </div>

                  <Button type="submit" variant="gradient" disabled={isUpdating}>
                    {isUpdating ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <TwoFactorSetup />
            <TenantSecurityPolicy />
          </TabsContent>

          <TabsContent value="provider" className="space-y-4">
            <ProviderDisplay />
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-4">
            <ApiKeysManager />
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <WebhooksManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
