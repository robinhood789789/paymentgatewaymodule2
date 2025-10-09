import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Settings = () => {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [fullName, setFullName] = useState("");

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
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ตั้งค่า</h1>
          <p className="text-muted-foreground">จัดการข้อมูลส่วนตัวและความปลอดภัย</p>
        </div>

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

        <Card>
          <CardHeader>
            <CardTitle>ความปลอดภัย</CardTitle>
            <CardDescription>จัดการการตั้งค่าความปลอดภัย</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">เปลี่ยนรหัสผ่าน</p>
                  <p className="text-sm text-muted-foreground">
                    อัพเดทรหัสผ่านเป็นระยะเพื่อความปลอดภัย
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                เปลี่ยน
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    เพิ่มความปลอดภัยด้วย 2FA
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                เร็วๆ นี้
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
