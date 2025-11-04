import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    full_name: string;
    email: string;
    status: string;
    tenant_id: string;
  } | null;
}

export function EditMemberDialog({ open, onOpenChange, member }: EditMemberDialogProps) {
  const [status, setStatus] = useState<string>(member?.status || "active");
  const queryClient = useQueryClient();

  // Update status whenever member changes
  useEffect(() => {
    if (member) {
      setStatus(member.status);
    }
  }, [member]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, tenantId, newStatus }: { userId: string; tenantId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("memberships")
        .update({ status: newStatus })
        .eq("user_id", userId)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      // Optimistically update the cached list so UI reflects immediately
      const { tenantId, userId, newStatus } = variables as { userId: string; tenantId: string; newStatus: string };
      queryClient.setQueryData(["admin-users", tenantId], (oldData: any) => {
        if (!oldData) return oldData;
        return (oldData as any[]).map((u) => (u.id === userId ? { ...u, status: newStatus } : u));
      });

      // Also invalidate to refetch from server and stay consistent
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("อัพเดทสถานะสำเร็จ!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("เกิดข้อผิดพลาด", {
        description: error.message,
      });
    },
  });

  const handleSubmit = () => {
    if (!member) return;
    
    updateStatusMutation.mutate({
      userId: member.id,
      tenantId: member.tenant_id,
      newStatus: status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>แก้ไขสถานะสมาชิก</DialogTitle>
          <DialogDescription>
            แก้ไขสถานะของ {member?.full_name || member?.email}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>อีเมล</Label>
            <div className="text-sm text-muted-foreground">{member?.email}</div>
          </div>

          <div className="space-y-3">
            <Label>สถานะ</Label>
            <RadioGroup value={status} onValueChange={setStatus}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active" className="font-normal cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Active - สามารถเข้าใช้งานได้
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inactive" id="inactive" />
                <Label htmlFor="inactive" className="font-normal cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Inactive - ไม่สามารถเข้าใช้งานได้
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={updateStatusMutation.isPending}>
            {updateStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
