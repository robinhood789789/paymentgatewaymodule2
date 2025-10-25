import DashboardLayout from "@/components/DashboardLayout";
import SuperAdminRoute from "@/components/SuperAdminRoute";
import { PlatformProvisioningManager } from "@/components/admin/PlatformProvisioningManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function PlatformProvisioning() {
  return (
    <SuperAdminRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Platform API Provisioning</h1>
            <p className="text-muted-foreground mt-2">
              จัดการ Platform Tokens สำหรับการสร้าง API Keys ผ่าน External Systems
            </p>
          </div>

          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Platform Tokens ใช้สำหรับ External Systems ในการสร้าง/จัดการ API Keys ของ Tenant แต่ละรายผ่าน HMAC-authenticated API endpoints
            </AlertDescription>
          </Alert>

          <PlatformProvisioningManager />

          <Card>
            <CardHeader>
              <CardTitle>การใช้งาน External API</CardTitle>
              <CardDescription>ตัวอย่าง API Endpoints สำหรับ External Systems</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="font-mono text-sm space-y-2 p-4 bg-muted rounded">
                <div className="text-primary font-semibold">POST /api/ext/v1/tenants/:tenant_id/api-keys</div>
                <div className="text-muted-foreground">สร้าง API Key ใหม่สำหรับ Tenant</div>
              </div>
              <div className="font-mono text-sm space-y-2 p-4 bg-muted rounded">
                <div className="text-primary font-semibold">POST /api/ext/v1/tenants/:tenant_id/api-keys/:key_id/rotate</div>
                <div className="text-muted-foreground">หมุนเวียน API Key (ออก Secret ใหม่)</div>
              </div>
              <div className="font-mono text-sm space-y-2 p-4 bg-muted rounded">
                <div className="text-primary font-semibold">POST /api/ext/v1/tenants/:tenant_id/api-keys/:key_id/revoke</div>
                <div className="text-muted-foreground">ยกเลิก API Key</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </SuperAdminRoute>
  );
}
