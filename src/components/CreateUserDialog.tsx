import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";

const createUserSchema = z.object({
  email: z.string().email("กรุณาใส่อีเมลที่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  full_name: z.string().min(1, "กรุณาใส่ชื่อ"),
  role: z.string().min(1, "กรุณาเลือกบทบาท"),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export const CreateUserDialog = () => {
  const [open, setOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { activeTenantId } = useTenantSwitcher();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
      role: "admin",
    },
  });

  // Fetch real permissions from database
  const { data: allPermissions = [] } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("id, name, description");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Map Thai permission names to database permission names
  const permissionMapping: Record<string, string> = {
    "ดูรายการเติมเงิน": "deposits.view",
    "สร้างคำขอเติมเงิน": "deposits.create",
    "ดูรายการถอนเงิน": "withdrawals.view", 
    "สร้างคำขอถอนเงิน": "withdrawals.create",
    "ดูรายการชำระเงิน": "payments.view",
    "สร้างคำขอชำระเงิน": "payments.create",
    "คืนเงิน": "payments.refund",
    "จัดการ API": "api_keys.manage"
  };

  // Define available permissions for admin users
  const availablePermissions = [
    { 
      id: allPermissions.find(p => p.name === permissionMapping["ดูรายการเติมเงิน"])?.id || "",
      name: "ดูรายการเติมเงิน", 
      description: "สิทธิ์ในการดูรายการฝากเงินในระบบ" 
    },
    { 
      id: allPermissions.find(p => p.name === permissionMapping["สร้างคำขอเติมเงิน"])?.id || "",
      name: "สร้างคำขอเติมเงิน", 
      description: "สิทธิ์ในการสร้างคำขอฝากเงินเข้าระบบ" 
    },
    { 
      id: allPermissions.find(p => p.name === permissionMapping["ดูรายการถอนเงิน"])?.id || "",
      name: "ดูรายการถอนเงิน", 
      description: "สิทธิ์ในการดูรายการถอนเงินในระบบ" 
    },
    { 
      id: allPermissions.find(p => p.name === permissionMapping["สร้างคำขอถอนเงิน"])?.id || "",
      name: "สร้างคำขอถอนเงิน", 
      description: "สิทธิ์ในการสร้างคำขอถอนเงินออกจากระบบ" 
    },
    { 
      id: allPermissions.find(p => p.name === permissionMapping["ดูรายการชำระเงิน"])?.id || "",
      name: "ดูรายการชำระเงิน", 
      description: "สิทธิ์ในการดูรายการชำระเงินของลูกค้า" 
    },
    { 
      id: allPermissions.find(p => p.name === permissionMapping["สร้างคำขอชำระเงิน"])?.id || "",
      name: "สร้างคำขอชำระเงิน", 
      description: "สิทธิ์ในการสร้างคำขอชำระเงินใหม่" 
    },
    { 
      id: allPermissions.find(p => p.name === permissionMapping["คืนเงิน"])?.id || "",
      name: "คืนเงิน", 
      description: "สิทธิ์ในการคืนเงินให้กับลูกค้า" 
    },
    { 
      id: allPermissions.find(p => p.name === permissionMapping["จัดการ API"])?.id || "",
      name: "จัดการ API", 
      description: "สิทธิ์ในการสร้างและจัดการ API Keys สำหรับการเชื่อมต่อระบบ" 
    },
  ].filter(p => p.id); // Filter out any that don't have IDs

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      // Get current user's tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");

      if (!activeTenantId) {
        throw new Error("กรุณาเลือก Workspace ก่อนสร้างผู้ใช้");
      }

      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("ไม่พบ session");

      // Call edge function to create user
      const { data: result, error } = await supabase.functions.invoke("create-admin-user", {
        body: {
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          role: data.role,
          tenant_id: activeTenantId,
          permissions: selectedPermissions, // Send selected permissions
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users", activeTenantId] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      const message = result?.message || "สร้างบัญชีผู้ใช้สำเร็จ!";
      toast.success(message);
      setOpen(false);
      form.reset();
      setSelectedPermissions([]); // Reset permissions
    },
    onError: (error: any) => {
      toast.error("เกิดข้อผิดพลาด", {
        description: error.message || "ไม่สามารถสร้างบัญชีได้",
      });
    },
  });

  const onSubmit = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" className="gap-2">
          <UserPlus className="w-4 h-4" />
          เพิ่มผู้ใช้
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>สร้างบัญชีผู้ใช้ใหม่</DialogTitle>
          <DialogDescription>
            กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ในระบบ
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 flex flex-col overflow-hidden">
            <div className="overflow-y-auto flex-1 space-y-3 pr-2">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ-นามสกุล</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อีเมล</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสผ่าน</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>บทบาท</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกบทบาท" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Permissions Selection - 4 permissions now */}
              <div className="space-y-2">
                <FormLabel>สิทธิ์การเข้าถึง</FormLabel>
                <div className="rounded-md border p-3 space-y-3">
                  {availablePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPermissions([...selectedPermissions, permission.id]);
                          } else {
                            setSelectedPermissions(
                              selectedPermissions.filter((id) => id !== permission.id)
                            );
                          }
                        }}
                      />
                      <div className="grid gap-0.5 leading-none">
                        <label
                          htmlFor={permission.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {permission.name}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  เลือกสิทธิ์ ({selectedPermissions.length} จาก {availablePermissions.length} รายการ)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t mt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? "กำลังสร้าง..." : "สร้างบัญชี"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
