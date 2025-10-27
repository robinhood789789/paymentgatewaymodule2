import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invokeFunctionWithTenant } from "@/lib/supabaseFunctions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowDownToLine } from "lucide-react";

interface SystemWithdrawalDialogProps {
  currentBalance: number;
  dailyLimit: number;
  usedToday: number;
}

export const SystemWithdrawalDialog = ({ currentBalance, dailyLimit, usedToday }: SystemWithdrawalDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("THB");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [notes, setNotes] = useState("");

  const createWithdrawalMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await invokeFunctionWithTenant("system-withdrawal-create", {
        body: data,
      });

      if (error) {
        if (error.requires_mfa) {
          throw new Error("กรุณายืนยันตัวตนด้วย 2FA ก่อนทำรายการถอนเงิน");
        }
        throw new Error(error.message || error.error || "เกิดข้อผิดพลาดในการสร้างคำขอถอนเงิน");
      }

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "สำเร็จ",
        description: data.requires_approval 
          ? "คำขอถอนเงินถูกสร้างแล้ว รอการอนุมัติ" 
          : "ถอนเงินสำเร็จแล้ว",
      });
      
      queryClient.invalidateQueries({ queryKey: ["tenant-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawal-daily-total"] });
      
      resetForm();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setAmount("");
    setCurrency("THB");
    setBankName("");
    setBankAccountNumber("");
    setBankAccountName("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกจำนวนเงินที่ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    if (!bankName || !bankAccountNumber || !bankAccountName) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกข้อมูลบัญชีธนาคารให้ครบถ้วน",
        variant: "destructive",
      });
      return;
    }

    // Convert to smallest currency unit (satang)
    const amountInSmallestUnit = Math.round(amountNum * 100);

    createWithdrawalMutation.mutate({
      amount: amountInSmallestUnit,
      currency,
      bank_name: bankName,
      bank_account_number: bankAccountNumber,
      bank_account_name: bankAccountName,
      notes: notes || undefined,
    });
  };

  const remainingDaily = Math.max(0, dailyLimit - usedToday);
  const maxWithdrawable = Math.min(currentBalance, remainingDaily);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ArrowDownToLine className="h-4 w-4" />
          ถอนเงินออกจากระบบ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>ถอนเงินออกจากระบบ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">จำนวนเงิน</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              ถอนได้สูงสุด: {(maxWithdrawable / 100).toLocaleString()} {currency}
            </p>
            <p className="text-xs text-muted-foreground">
              วงเงินคงเหลือวันนี้: {(remainingDaily / 100).toLocaleString()} {currency}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">สกุลเงิน</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="THB">THB (บาท)</SelectItem>
                <SelectItem value="USD">USD (ดอลลาร์)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_name">ธนาคาร</Label>
            <Select value={bankName} onValueChange={setBankName}>
              <SelectTrigger id="bank_name">
                <SelectValue placeholder="เลือกธนาคาร" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="กสิกรไทย">ธนาคารกสิกรไทย</SelectItem>
                <SelectItem value="กรุงเทพ">ธนาคารกรุงเทพ</SelectItem>
                <SelectItem value="กรุงไทย">ธนาคารกรุงไทย</SelectItem>
                <SelectItem value="ไทยพาณิชย์">ธนาคารไทยพาณิชย์</SelectItem>
                <SelectItem value="กรุงศรีอยุธยา">ธนาคารกรุงศรีอยุธยา</SelectItem>
                <SelectItem value="ทหารไทยธนชาต">ธนาคารทหารไทยธนชาต</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_number">เลขที่บัญชี</Label>
            <Input
              id="account_number"
              type="text"
              placeholder="xxx-x-xxxxx-x"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_name">ชื่อบัญชี</Label>
            <Input
              id="account_name"
              type="text"
              placeholder="ชื่อเจ้าของบัญชี"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              id="notes"
              placeholder="บันทึกเพิ่มเติม..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createWithdrawalMutation.isPending}
            >
              {createWithdrawalMutation.isPending ? "กำลังดำเนินการ..." : "ยืนยันถอนเงิน"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};