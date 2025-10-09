import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard, TrendingUp, Activity } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const Dashboard = () => {
  const { user, userRole } = useAuth();

  const stats = [
    {
      title: "ผู้ใช้งานทั้งหมด",
      value: "2,543",
      change: "+12.5%",
      icon: Users,
      color: "text-primary",
    },
    {
      title: "รายได้รวม",
      value: "฿48,532",
      change: "+23.1%",
      icon: CreditCard,
      color: "text-success",
    },
    {
      title: "อัตราการเติบโต",
      value: "32.4%",
      change: "+5.2%",
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      title: "Active Users",
      value: "1,429",
      change: "+8.3%",
      icon: Activity,
      color: "text-secondary",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">ยินดีต้อนรับกลับมา, {user?.email}</p>
          </div>
          <Badge variant="outline" className="text-sm">
            {userRole === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-success">{stat.change}</span> จากเดือนที่แล้ว
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>ภาพรวมล่าสุด</CardTitle>
              <CardDescription>การเปลี่ยนแปลงในระบบ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">ผู้ใช้งานใหม่</p>
                    <p className="text-sm text-muted-foreground">+124 คนในสัปดาห์นี้</p>
                  </div>
                  <Badge className="bg-success text-success-foreground">+12%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">รายการชำระเงิน</p>
                    <p className="text-sm text-muted-foreground">532 รายการ</p>
                  </div>
                  <Badge className="bg-success text-success-foreground">+8%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Conversion Rate</p>
                    <p className="text-sm text-muted-foreground">3.2% ของผู้เข้าชม</p>
                  </div>
                  <Badge>+2.1%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>เมนูที่ใช้บ่อย</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                  <p className="font-medium">เพิ่มผู้ใช้ใหม่</p>
                  <p className="text-sm text-muted-foreground">สร้างบัญชีผู้ใช้ในระบบ</p>
                </button>
                <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                  <p className="font-medium">ดูรายงาน</p>
                  <p className="text-sm text-muted-foreground">สรุปข้อมูลประจำเดือน</p>
                </button>
                <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                  <p className="font-medium">ตั้งค่าระบบ</p>
                  <p className="text-sm text-muted-foreground">จัดการการตั้งค่าทั่วไป</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
