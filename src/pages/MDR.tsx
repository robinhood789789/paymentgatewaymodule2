import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MdrData {
  date: Date;
  merchant: string;
  depositTotal: number;
  depositMdr: number;
  topupTotal: number;
  topupMdr: number;
  payoutTotal: number;
  payoutMdr: number;
  settlementTotal: number;
  settlementMdr: number;
}

const MDR = () => {
  const [date, setDate] = useState<Date>();
  const [merchantId, setMerchantId] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [topupAmount, setTopupAmount] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [mdrData, setMdrData] = useState<MdrData[]>([]);

  // MDR percentage (ค่าเริ่มต้น 2%)
  const mdrPercentage = 2;

  const calculateMdr = (amount: number) => {
    return (amount * mdrPercentage) / 100;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !merchantId) return;

    const deposit = parseFloat(depositAmount) || 0;
    const topup = parseFloat(topupAmount) || 0;
    const payout = parseFloat(payoutAmount) || 0;
    const settlement = parseFloat(settlementAmount) || 0;

    const newEntry: MdrData = {
      date: date,
      merchant: merchantId,
      depositTotal: deposit,
      depositMdr: calculateMdr(deposit),
      topupTotal: topup,
      topupMdr: calculateMdr(topup),
      payoutTotal: payout,
      payoutMdr: calculateMdr(payout),
      settlementTotal: settlement,
      settlementMdr: calculateMdr(settlement),
    };

    setMdrData([...mdrData, newEntry]);
    
    // Reset form
    setMerchantId("");
    setDepositAmount("");
    setTopupAmount("");
    setPayoutAmount("");
    setSettlementAmount("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">MDR</h1>
          <p className="text-muted-foreground">
            จัดการค่านายหน้า MDR (Merchant Discount Rate)
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>กรอกข้อมูล MDR</CardTitle>
            <CardDescription>
              กรอกข้อมูลเพื่อคำนวณค่านายหน้า (MDR {mdrPercentage}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">วันที่</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "dd/MM/yyyy") : "เลือกวันที่"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="merchantId">Merchant ID</Label>
                  <Input
                    id="merchantId"
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value)}
                    placeholder="กรอก Merchant ID"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Deposit Amount</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  {depositAmount && (
                    <p className="text-sm text-muted-foreground">
                      MDR: {formatCurrency(calculateMdr(parseFloat(depositAmount)))} ({mdrPercentage}%)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topupAmount">Top-up Amount</Label>
                  <Input
                    id="topupAmount"
                    type="number"
                    step="0.01"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  {topupAmount && (
                    <p className="text-sm text-muted-foreground">
                      MDR: {formatCurrency(calculateMdr(parseFloat(topupAmount)))} ({mdrPercentage}%)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payoutAmount">Payout Amount</Label>
                  <Input
                    id="payoutAmount"
                    type="number"
                    step="0.01"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  {payoutAmount && (
                    <p className="text-sm text-muted-foreground">
                      MDR: {formatCurrency(calculateMdr(parseFloat(payoutAmount)))} ({mdrPercentage}%)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="settlementAmount">Settlement Amount</Label>
                  <Input
                    id="settlementAmount"
                    type="number"
                    step="0.01"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  {settlementAmount && (
                    <p className="text-sm text-muted-foreground">
                      MDR: {formatCurrency(calculateMdr(parseFloat(settlementAmount)))} ({mdrPercentage}%)
                    </p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full md:w-auto">
                บันทึกข้อมูล
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ตารางข้อมูล MDR</CardTitle>
            <CardDescription>
              รายละเอียดค่านายหน้าทั้งหมด
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead className="text-right">Total Deposit</TableHead>
                    <TableHead className="text-right">Deposit MDR</TableHead>
                    <TableHead className="text-right">Total Top-up</TableHead>
                    <TableHead className="text-right">Top-up MDR</TableHead>
                    <TableHead className="text-right">Total Payout</TableHead>
                    <TableHead className="text-right">Payout MDR</TableHead>
                    <TableHead className="text-right">Total Settlement</TableHead>
                    <TableHead className="text-right">Settlement MDR</TableHead>
                    <TableHead className="text-right">Total MDR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mdrData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground">
                        ยังไม่มีข้อมูล
                      </TableCell>
                    </TableRow>
                  ) : (
                    mdrData.map((item, index) => {
                      const totalMdr = item.depositMdr + item.topupMdr + item.payoutMdr + item.settlementMdr;
                      return (
                        <TableRow key={index}>
                          <TableCell>{format(item.date, "dd/MM/yyyy")}</TableCell>
                          <TableCell>{item.merchant}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.depositTotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.depositMdr)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.topupTotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.topupMdr)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.payoutTotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.payoutMdr)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.settlementTotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.settlementMdr)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(totalMdr)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MDR;
