import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Copy, Check, AlertTriangle, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { use2FAChallenge } from "@/hooks/use2FAChallenge";
import { TwoFactorChallenge } from "@/components/security/TwoFactorChallenge";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  business_name: z.string().min(2, "ชื่อธุรกิจต้องมีอย่างน้อย 2 ตัวอักษร"),
  owner_email: z.string().email("อีเมลไม่ถูกต้อง"),
  owner_full_name: z.string().min(2, "ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร"),
  business_type: z.string().min(1, "กรุณาเลือกประเภทธุรกิจ"),
  provider: z.string().default("stripe"),
  force_2fa: z.boolean().default(true),
  platform_fee_percent: z.number().min(0).max(100).default(2.5),
  features: z.array(z.string()).default([]),
});

interface ProvisionMerchantDialogProps {
  children?: React.ReactNode;
}

export function ProvisionMerchantDialog({ children }: ProvisionMerchantDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [provisionedTenant, setProvisionedTenant] = useState<any>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const { isOpen, setIsOpen, checkAndChallenge, onSuccess } = use2FAChallenge();
  const queryClient = useQueryClient();

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
    enabled: open,
  });

  const provisionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("ไม่พบ session");

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
      toast.success("สร้าง Merchant สำเร็จ");
      setProvisionedTenant(data);
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      
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
      toast.error(error.message || "เกิดข้อผิดพลาดในการสร้าง Merchant");
    },
  });

  const handleProvision = (data: z.infer<typeof formSchema>) => {
    checkAndChallenge(() => provisionMutation.mutate(data));
  };

  const handleCopyPassword = () => {
    if (provisionedTenant?.temporary_password) {
      navigator.clipboard.writeText(provisionedTenant.temporary_password);
      setCopiedPassword(true);
      toast.success("คัดลอกรหัสผ่านแล้ว");
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const handleReset = () => {
    setProvisionedTenant(null);
    form.reset();
  };

  const handleClose = () => {
    setOpen(false);
    setProvisionedTenant(null);
    setCopiedPassword(false);
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

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children || (
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              สร้าง Merchant
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {provisionedTenant ? "Merchant ถูกสร้างแล้ว" : "สร้าง Merchant ใหม่"}
            </DialogTitle>
            <DialogDescription>
              {provisionedTenant 
                ? "บัญชี Merchant และ Workspace ถูกสร้างเรียบร้อยแล้ว"
                : "กรอกข้อมูลเพื่อสร้าง Merchant Workspace และบัญชี Owner"
              }
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            {provisionedTenant ? (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>สำคัญ:</strong> กรุณาบันทึกข้อมูลนี้ รหัสผ่านชั่วคราวจะไม่แสดงอีกครั้ง
                  </AlertDescription>
                </Alert>

                <div className="rounded-lg border p-4 space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Tenant/Workspace</div>
                    <div className="text-lg font-semibold">{provisionedTenant.tenant.name}</div>
                    <div className="text-xs text-muted-foreground">ID: {provisionedTenant.tenant.id}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">อีเมล Owner</div>
                    <div className="text-lg font-semibold">{provisionedTenant.user.email}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">ชื่อ Owner</div>
                    <div className="text-lg font-semibold">{provisionedTenant.user.full_name}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">รหัสผ่านชั่วคราว</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
                        {provisionedTenant.temporary_password}
                      </code>
                      <Button size="sm" variant="outline" onClick={handleCopyPassword}>
                        {copiedPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ผู้ใช้จะถูกบังคับให้เปลี่ยนรหัสผ่านเมื่อล็อกอินครั้งแรก
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      2FA: {provisionedTenant.force_2fa ? "บังคับ" : "ไม่บังคับ"}
                    </Badge>
                    <Badge variant="outline">
                      Provider: {provisionedTenant.tenant.provider || "stripe"}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleReset} variant="outline" className="flex-1">
                    สร้าง Merchant ใหม่
                  </Button>
                  <Button onClick={handleClose} className="flex-1">
                    ปิด
                  </Button>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleProvision)} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">ข้อมูลธุรกิจ</h3>
                    
                    <FormField
                      control={form.control}
                      name="business_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ชื่อธุรกิจ</FormLabel>
                          <FormControl>
                            <Input placeholder="บริษัท ABC จำกัด" {...field} />
                          </FormControl>
                          <FormDescription>
                            ชื่อนี้จะเป็นชื่อ Tenant/Workspace
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
                          <FormLabel>ประเภทธุรกิจ</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกประเภทธุรกิจ" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="retail">ร้านค้าปลีก</SelectItem>
                              <SelectItem value="ecommerce">E-commerce</SelectItem>
                              <SelectItem value="saas">SaaS</SelectItem>
                              <SelectItem value="marketplace">Marketplace</SelectItem>
                              <SelectItem value="other">อื่นๆ</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold">บัญชี Owner</h3>
                    
                    <FormField
                      control={form.control}
                      name="owner_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>อีเมล Owner</FormLabel>
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
                          <FormLabel>ชื่อ-นามสกุล Owner</FormLabel>
                          <FormControl>
                            <Input placeholder="สมชาย ใจดี" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold">การตั้งค่า</h3>

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
                          <FormLabel>ค่าธรรมเนียม Platform (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            เปอร์เซ็นต์ค่าคอมมิชชั่น Platform (0-100%)
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
                              บังคับใช้ 2FA สำหรับ Owner
                            </FormLabel>
                            <FormDescription>
                              ต้องตั้งค่า 2FA เมื่อล็อกอินครั้งแรก (แนะนำ)
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
                            <FormLabel className="text-base">ฟีเจอร์ที่เปิดใช้งาน</FormLabel>
                            <FormDescription>
                              เลือกฟีเจอร์ที่จะเปิดให้ Tenant นี้ใช้งาน
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
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {feature.label}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {platformPolicy?.force_2fa_for_super_admin && (
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        การดำเนินการนี้ต้องมีการยืนยันตัวตนด้วย 2FA
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={provisionMutation.isPending} className="flex-1">
                      {provisionMutation.isPending ? "กำลังสร้าง..." : "สร้าง Merchant"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <TwoFactorChallenge
        open={isOpen}
        onOpenChange={setIsOpen}
        onSuccess={onSuccess}
        title="ยืนยันตัวตนด้วย 2FA"
        description="กรุณากรอกรหัส 6 หลักจาก Authenticator App เพื่อสร้าง Merchant"
      />
    </>
  );
}
