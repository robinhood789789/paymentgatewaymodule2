import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface EditOwnerDialogProps {
  owner: {
    ownerId: string;
    businessName: string;
    publicId: string;
    email?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditOwnerDialog({ owner, open, onOpenChange, onSuccess }: EditOwnerDialogProps) {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (owner) {
      setBusinessName(owner.businessName || "");
      setEmail(owner.email || "");
    }
  }, [owner]);

  const handleSubmit = async () => {
    if (!owner) return;

    if (!businessName.trim()) {
      toast.error("กรุณากรอกชื่อธุรกิจ");
      return;
    }

    try {
      setLoading(true);

      // Update tenant name only (email should be handled separately through proper channels)
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({ name: businessName })
        .eq("id", owner.ownerId);

      if (tenantError) throw tenantError;

      toast.success("อัปเดทข้อมูลสำเร็จ");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating owner:", error);
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!owner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>แก้ไขข้อมูล Owner</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Public ID</Label>
            <Input
              value={owner.publicId}
              disabled
              className="font-mono bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>ชื่อธุรกิจ *</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="บริษัท ABC จำกัด"
            />
          </div>

          <div className="space-y-2">
            <Label>อีเมล</Label>
            <Input
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              อีเมลไม่สามารถแก้ไขได้ในขณะนี้
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึกการเปลี่ยนแปลง"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
