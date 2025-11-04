import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Owner = {
  ownerId: string;
  businessName: string;
  publicId: string;
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
  const [createdPublicId, setCreatedPublicId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState<Owner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    business_name: "",
    email: "",
    prefix: "",
    number: "",
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
    if (!formData.business_name) {
      toast({ title: "กรุณากรอกชื่อธุรกิจ", variant: "destructive" });
      return;
    }

    if (!formData.prefix || !formData.number) {
      toast({ title: "กรุณากรอก Public ID ให้ครบถ้วน", variant: "destructive" });
      return;
    }

    // Validate prefix (2-6 uppercase letters/numbers)
    if (!/^[A-Z0-9]{2,6}$/.test(formData.prefix)) {
      toast({ title: "Prefix ต้องเป็นตัวอักษร/ตัวเลขภาษาอังกฤษ 2-6 ตัว", variant: "destructive" });
      return;
    }

    // Validate number (exactly 6 digits)
    if (!/^\d{6}$/.test(formData.number)) {
      toast({ title: "Number ต้องเป็นตัวเลข 6 หลักเท่านั้น", variant: "destructive" });
      return;
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({ title: "รูปแบบอีเมลไม่ถูกต้อง", variant: "destructive" });
      return;
    }

    try {
      setCreating(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const public_id = `${formData.prefix}-${formData.number}`;

      const response = await supabase.functions.invoke('shareholder-create-owner', {
        headers: { Authorization: `Bearer ${token}` },
        body: {
          business_name: formData.business_name,
          email: formData.email,
          public_id: public_id,
        },
      });

      if (response.error) throw new Error(response.error.message || 'Failed to create owner');
      if (!response.data.success) throw new Error(response.data.error || 'Failed to create owner');

      setTempPassword(response.data.data.temporary_password);
      setCreatedPublicId(response.data.data.public_id);
      toast({ title: "สร้าง Owner สำเร็จ!", description: `Public ID: ${response.data.data.public_id}` });
      
      // Reset form
      setFormData({
        business_name: "",
        email: "",
        prefix: "",
        number: "",
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
    setCreatedPublicId(null);
    setShowPassword(false);
  };

  const handleDeleteClick = (owner: Owner) => {
    setOwnerToDelete(owner);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ownerToDelete) return;

    try {
      setDeleting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await supabase.functions.invoke('shareholder-delete-owner', {
        headers: { Authorization: `Bearer ${token}` },
        body: { tenant_id: ownerToDelete.ownerId },
      });

      if (response.error) throw new Error(response.error.message || 'Failed to delete owner');
      if (!response.data.success) throw new Error(response.data.error || 'Failed to delete owner');

      toast({
        title: "ลบ Owner และบัญชีสำเร็จ",
        description: `${ownerToDelete.businessName} และบัญชีทั้งหมดถูกลบออกจากระบบแล้ว`,
      });

      setDeleteDialogOpen(false);
      setOwnerToDelete(null);
      fetchOwners();
    } catch (error: any) {
      console.error('Error deleting owner:', error);
      toast({
        title: "ลบ Owner ไม่สำเร็จ",
        description: error.message || "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
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

                {createdPublicId && (
                  <div className="space-y-2">
                    <Label>Public ID</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={createdPublicId} 
                        readOnly 
                        className="font-mono text-lg font-semibold"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(createdPublicId);
                          toast({ title: "คัดลอกแล้ว", description: "Public ID ถูกคัดลอกไปยังคลิปบอร์ด" });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ใช้ Public ID นี้ในการเข้าสู่ระบบ
                    </p>
                  </div>
                )}

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
                    กำหนด Public ID ของ Owner ด้วยตัวเอง (เช่น OWN-123456)
                  </AlertDescription>
                </Alert>

                <div>
                  <Label>ชื่อธุรกิจ *</Label>
                  <Input 
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="บริษัท ABC จำกัด"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ชื่อธุรกิจหรือองค์กร
                  </p>
                </div>

                <div>
                  <Label>Public ID *</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input 
                        value={formData.prefix}
                        onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) })}
                        placeholder="OWN"
                        maxLength={6}
                        className="uppercase font-mono text-center"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Prefix (2-6 ตัว)
                      </p>
                    </div>
                    <div className="flex items-center justify-center px-2 text-2xl font-bold text-muted-foreground">
                      -
                    </div>
                    <div className="flex-1">
                      <Input 
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                        placeholder="123456"
                        maxLength={6}
                        className="font-mono text-center"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        ตัวเลข (6 หลัก)
                      </p>
                    </div>
                  </div>
                  {formData.prefix && formData.number && (
                    <div className="mt-2 p-2 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">Preview:</p>
                      <p className="font-mono font-bold text-lg text-primary">
                        {formData.prefix}-{formData.number}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label>อีเมล (ไม่บังคับ)</Label>
                  <Input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="owner@example.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    หากไม่ระบุ ระบบจะสร้างอีเมลภายในให้อัตโนมัติ
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
                  <th className="text-left p-3">Public ID</th>
                  <th className="text-left p-3">ธุรกิจ</th>
                  <th className="text-left p-3">วันที่สร้าง</th>
                  <th className="text-left p-3">สถานะ</th>
                  <th className="text-left p-3">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {owners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      ยังไม่มี Owner user
                    </td>
                  </tr>
                ) : (
                  owners.map((owner) => (
                    <tr key={owner.ownerId} className="border-b">
                      <td className="p-3 font-mono font-semibold text-primary">{owner.publicId}</td>
                      <td className="p-3 font-medium">{owner.businessName}</td>
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
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(owner)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ Owner</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบ <span className="font-semibold">{ownerToDelete?.businessName}</span> (Public ID: <span className="font-mono font-semibold">{ownerToDelete?.publicId}</span>)?
              <br /><br />
              <span className="text-destructive font-semibold">การกระทำนี้ไม่สามารถย้อนกลับได้</span> และจะลบข้อมูลทั้งหมดของ Owner นี้ออกจากระบบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                "ลบ Owner"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
