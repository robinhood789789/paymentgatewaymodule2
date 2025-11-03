import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function ShareholderSettings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ตั้งค่า</h1>
        <p className="text-muted-foreground">การตั้งค่าบัญชี Shareholder</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          ฟีเจอร์การตั้งค่าจะมีให้ใช้งานในเร็วๆ นี้
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลบัญชี</CardTitle>
          <CardDescription>การตั้งค่าบัญชีและความปลอดภัย</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            คุณสามารถอัปเดตข้อมูลบัญชีและการตั้งค่าความปลอดภัยได้ในภายหลัง
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
