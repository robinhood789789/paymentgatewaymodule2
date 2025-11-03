import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Copy, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Owner = {
  ownerId: string;
  businessName: string;
  userId: string;
  createdAt: string;
  status: string;
};

export default function ShareholderTeam() {
  const { toast } = useToast();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    user_id: "",
  });

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await supabase.functions.invoke('shareholder-referral-tenants', {
        headers: { Authorization: `Bearer ${token}` },
        body: { status: 'All' },
      });

      if (response.error) throw response.error;
      setOwners(response.data.data || []);
    } catch (error) {
      console.error('Error fetching owners:', error);
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถโหลดข้อมูลได้", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.user_id) {
      toast({ title: "กรุณากรอก User ID", variant: "destructive" });
      return;
    }

    // Validate user_id format (6 digits)
    if (!/^\d{6}$/.test(formData.user_id)) {
      toast({ title: "User ID ต้องเป็นตัวเลข 6 หลัก", variant: "destructive" });
      return;
    }

    try {
      setCreating(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await supabase.functions.invoke('shareholder-create-owner', {
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.error) throw new Error(response.error.message || 'Failed to create owner');
      if (!response.data.success) throw new Error(response.data.error || 'Failed to create owner');

      setTempPassword(response.data.data.temporary_password);
      toast({ title: "สร้าง Owner สำเร็จ!", description: "กรุณาคัดลอกรหัสผ่านชั่วคราว" });
      
      // Reset form
      setFormData({
        user_id: "",
      });

      fetchOwners();
    } catch (error: any) {
      console.error('Error creating owner:', error);
      toast({ 
        title: "สร้าง Owner ไม่สำเร็จ", 
        description: error.message || "เกิดข้อผิดพลาด",
        variant: "destructive" 
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      toast({ title: "คัดลอกแล้ว", description: "รหัสผ่านชั่วคราวถูกคัดลอกไปยังคลิปบอร์ด" });
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTempPassword(null);
    setShowPassword(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ทีมงาน</h1>
          <p className="text-muted-foreground">จัดการ Owner users</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              สร้าง Owner user
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>สร้าง Owner User ใหม่</DialogTitle>
            </DialogHeader>

            {tempPassword ? (
              <div className="space-y-4">
                <Alert className="border-green-500 bg-green-50">
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold text-green-900">สร้าง Owner สำเร็จ!</p>
                      <p className="text-sm text-green-800">
                        รหัสผ่านชั่วคราวจะแสดงเพียงครั้งเดียว กรุณาคัดลอกและส่งให้ Owner อย่างปลอดภัย
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>รหัสผ่านชั่วคราว</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showPassword ? "text" : "password"}
                      value={tempPassword} 
                      readOnly 
                      className="font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleCopyPassword}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Owner จะต้องสแกน QR เพื่อเปิดใช้งาน 2FA และเปลี่ยนรหัสผ่านในการเข้าสู่ระบบครั้งแรก
                  </p>
                </div>

                <Button onClick={handleCloseDialog} className="w-full">
                  ปิด
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    กำหนด User ID (6 หลัก) ระบบจะสร้างรหัสผ่านชั่วคราวให้อัตโนมัติ
                  </AlertDescription>
                </Alert>

                <div>
                  <Label>User ID *</Label>
                  <Input 
                    value={formData.user_id}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setFormData({ ...formData, user_id: value });
                    }}
                    placeholder="123456"
                    maxLength={6}
                    className="font-mono text-lg tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ตัวเลข 6 หลัก สำหรับระบุตัวตน Owner
                  </p>
                </div>

                <Button 
                  onClick={handleCreate} 
                  disabled={creating}
                  className="w-full"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังสร้าง...
                    </>
                  ) : (
                    "สร้าง Owner"
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Owner Users ({owners.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">ธุรกิจ</th>
                  <th className="text-left p-3">User ID</th>
                  <th className="text-left p-3">วันที่สร้าง</th>
                  <th className="text-left p-3">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {owners.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      ยังไม่มี Owner user
                    </td>
                  </tr>
                ) : (
                  owners.map((owner) => (
                    <tr key={owner.ownerId} className="border-b">
                      <td className="p-3 font-medium">{owner.businessName}</td>
                      <td className="p-3 text-muted-foreground font-mono">{owner.userId}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(owner.createdAt).toLocaleDateString('th-TH')}
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={owner.status === 'Active' ? 'default' : 'secondary'}
                        >
                          {owner.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
