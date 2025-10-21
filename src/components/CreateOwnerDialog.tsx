import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Copy, Check } from "lucide-react";
import { use2FAChallenge } from "@/hooks/use2FAChallenge";
import { TwoFactorChallenge } from "@/components/security/TwoFactorChallenge";

const formSchema = z.object({
  email: z.string().email("กรุณากรอกอีเมลให้ถูกต้อง"),
  full_name: z.string().min(1, "กรุณากรอกชื่อ-นามสกุล"),
  tenant_name: z.string().min(1, "กรุณากรอกชื่อองค์กร"),
});

interface CreateOwnerDialogProps {
  children?: React.ReactNode;
}

export function CreateOwnerDialog({ children }: CreateOwnerDialogProps) {
  const [open, setOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    tenant_name: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const queryClient = useQueryClient();
  const { isOpen: is2FAOpen, setIsOpen: set2FAOpen, checkAndChallenge, onSuccess } = use2FAChallenge();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      full_name: "",
      tenant_name: "",
    },
  });

  const createOwnerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("ไม่พบ session");

      const { data: result, error } = await supabase.functions.invoke("create-owner-user", {
        body: data,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      toast.success("สร้าง Owner User สำเร็จ");
      setCreatedCredentials({
        email: data.user.email,
        password: data.temporary_password,
        tenant_name: data.tenant.name,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "เกิดข้อผิดพลาดในการสร้าง Owner User");
    },
  });

  const handleCopyPassword = () => {
    if (createdCredentials) {
      navigator.clipboard.writeText(createdCredentials.password);
      setCopiedPassword(true);
      toast.success("คัดลอก Password แล้ว");
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCreatedCredentials(null);
    setCopiedPassword(false);
  };

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    // Check 2FA and challenge if needed
    await checkAndChallenge(() => createOwnerMutation.mutate(data));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            สร้าง Owner User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>สร้าง Owner User และ Tenant ใหม่</DialogTitle>
          <DialogDescription>
            สร้างบัญชี Owner พร้อม Workspace ใหม่สำหรับลูกค้า
          </DialogDescription>
        </DialogHeader>

        {!createdCredentials ? (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อีเมล</FormLabel>
                    <FormControl>
                      <Input placeholder="owner@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ-นามสกุล</FormLabel>
                    <FormControl>
                      <Input placeholder="สมชาย ใจดี" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tenant_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อองค์กร</FormLabel>
                    <FormControl>
                      <Input placeholder="บริษัท ABC จำกัด" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={createOwnerMutation.isPending}>
                  {createOwnerMutation.isPending ? "กำลังสร้าง..." : "สร้าง Owner"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="font-semibold text-lg text-center text-green-600">
                ✓ สร้างบัญชีสำเร็จ
              </div>
              
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">องค์กร</div>
                  <div className="font-medium">{createdCredentials.tenant_name}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">อีเมล</div>
                  <div className="font-medium">{createdCredentials.email}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">รหัสผ่านชั่วคราว</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm">
                      {createdCredentials.password}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyPassword}
                    >
                      {copiedPassword ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded border border-amber-200 dark:border-amber-900">
                ⚠️ โปรดบันทึกข้อมูลนี้และส่งให้ Owner เนื่องจากรหัสผ่านจะไม่แสดงอีกครั้ง
              </div>
            </div>

            <Button onClick={handleClose} className="w-full">
              ปิด
            </Button>
          </div>
        )}
      </DialogContent>

      <TwoFactorChallenge
        open={is2FAOpen}
        onOpenChange={set2FAOpen}
        onSuccess={onSuccess}
        title="ยืนยันตัวตนด้วย 2FA"
        description="กรุณากรอกรหัส 6 หลักจาก Authenticator App หรือ Recovery Code เพื่อสร้าง Owner User"
      />
    </Dialog>
  );
}
