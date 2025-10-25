import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunctionWithTenant } from "@/lib/supabaseFunctions";
import { use2FAChallenge } from "@/hooks/use2FAChallenge";
import { TwoFactorChallenge } from "@/components/security/TwoFactorChallenge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Key, Copy, CheckCircle, XCircle, AlertTriangle, Trash2, Download } from "lucide-react";
import { format } from "date-fns";

export function PlatformProvisioningManager() {
  const queryClient = useQueryClient();
  const { isOpen, setIsOpen, checkAndChallenge, onSuccess } = use2FAChallenge();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTokenSecret, setNewTokenSecret] = useState<string | null>(null);
  const [platformName, setPlatformName] = useState("");
  const [notes, setNotes] = useState("");
  const [revokeTokenId, setRevokeTokenId] = useState<string | null>(null);

  const { data: tokens, isLoading } = useQuery({
    queryKey: ["platform-tokens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_provisioning_tokens")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokeFunctionWithTenant("platform-tokens-create", {
        body: { platform_name: platformName, notes },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setNewTokenSecret(data.secret);
      setPlatformName("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["platform-tokens"] });
      toast.success("สร้าง Platform Token สำเร็จ");
    },
    onError: (error: Error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const { data, error } = await invokeFunctionWithTenant("platform-tokens-revoke", {
        body: { platform_token_id: tokenId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setRevokeTokenId(null);
      queryClient.invalidateQueries({ queryKey: ["platform-tokens"] });
      toast.success("ยกเลิก Token สำเร็จ");
    },
  });

  const handleCreate = () => {
    if (!platformName.trim()) {
      toast.error("กรุณาระบุชื่อ Platform");
      return;
    }
    checkAndChallenge(() => createMutation.mutate());
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("คัดลอกแล้ว");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Platform Provisioning Tokens
              </CardTitle>
              <CardDescription>
                จัดการ Platform Token สำหรับการสร้าง API Keys ผ่าน External API
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              สร้าง Platform Token
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">กำลังโหลด...</div>
          ) : !tokens?.length ? (
            <div className="text-center py-8">ยังไม่มี Platform Token</div>
          ) : (
            <div className="space-y-4">
              {tokens.map((token) => (
                <div key={token.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold">{token.platform_id}</span>
                      <Badge variant={token.status === "active" ? "default" : "destructive"}>
                        {token.status === "active" ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {token.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{token.platform_name}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                      <span>สร้าง: {format(new Date(token.created_at), "dd/MM/yyyy HH:mm")}</span>
                    </div>
                  </div>
                  {token.status === "active" && (
                    <Button variant="destructive" size="sm" onClick={() => setRevokeTokenId(token.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      ยกเลิก
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TwoFactorChallenge open={isOpen} onOpenChange={setIsOpen} onSuccess={onSuccess} />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้าง Platform Token ใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="platform_name">ชื่อ Platform *</Label>
              <Input id="platform_name" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="notes">หมายเหตุ</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "กำลังสร้าง..." : "สร้าง Token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {newTokenSecret && (
        <Dialog open={!!newTokenSecret} onOpenChange={() => setNewTokenSecret(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Platform Token สร้างสำเร็จ</DialogTitle>
              <DialogDescription className="text-destructive font-semibold">
                ⚠️ Secret จะแสดงเพียงครั้งเดียว
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label>Platform Secret</Label>
              <div className="flex gap-2 mt-1">
                <Input value={newTokenSecret} readOnly className="font-mono text-sm" />
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(newTokenSecret)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setNewTokenSecret(null)}>ฉันได้บันทึกแล้ว</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!revokeTokenId} onOpenChange={() => setRevokeTokenId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิก?</AlertDialogTitle>
            <AlertDialogDescription>
              การยกเลิก Token จะทำให้ไม่สามารถใช้งานได้ทันที
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTokenId && checkAndChallenge(() => revokeMutation.mutate(revokeTokenId))}
              className="bg-destructive"
            >
              ยืนยัน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
