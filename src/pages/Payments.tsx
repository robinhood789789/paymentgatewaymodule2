import DashboardLayout from "@/components/DashboardLayout";
import PaymentForm from "@/components/PaymentForm";
import ProductCard from "@/components/ProductCard";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { RequireTenant } from "@/components/RequireTenant";
import { PermissionGate } from "@/components/PermissionGate";

const Payments = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const products = [
    {
      title: "Starter",
      price: "฿299",
      period: "เดือน",
      features: [
        "รับชำระเงินได้สูงสุด ฿50,000/เดือน",
        "ค่าธรรมเนียม 2.9%",
        "รองรับบัตรเครดิต/เดบิต",
        "รายงานพื้นฐาน",
        "รองรับ QR Code",
      ],
    },
    {
      title: "Business",
      price: "฿999",
      period: "เดือน",
      features: [
        "รับชำระเงินได้ไม่จำกัด",
        "ค่าธรรมเนียม 2.5%",
        "รองรับทุกช่องทางการชำระเงิน",
        "รายงานขั้นสูง + Analytics",
        "API Integration",
        "ถอนเงินอัตโนมัติรายวัน",
        "ทีมสนับสนุน 24/7",
      ],
      popular: true,
    },
    {
      title: "Enterprise",
      price: "฿2,999",
      period: "เดือน",
      features: [
        "ทุกอย่างใน Business",
        "ค่าธรรมเนียมพิเศษ 2.0%",
        "Account Manager ส่วนตัว",
        "Custom Integration",
        "White Label Solution",
        "Priority Support",
        "SLA 99.99% Uptime",
      ],
    },
  ];

  return (
    <DashboardLayout>
      <RequireTenant>
        <div className="p-6">
          {!showPaymentForm ? (
            <div className="max-w-6xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground">แพ็กเกจการชำระเงิน</h1>
                <p className="text-muted-foreground">เลือกแพ็กเกจที่เหมาะกับธุรกิจของคุณ</p>
              </div>

              <PermissionGate 
                permission="payments:read"
                fallback={
                  <div className="text-center p-8 border rounded-lg">
                    <p className="text-muted-foreground">You don't have permission to view payment packages</p>
                  </div>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {products.map((product, index) => (
                    <ProductCard
                      key={index}
                      {...product}
                      onSelect={() => setShowPaymentForm(true)}
                    />
                  ))}
                </div>
              </PermissionGate>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              <Button
                onClick={() => setShowPaymentForm(false)}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                กลับไปเลือกแพ็กเกจ
              </Button>
              <PermissionGate 
                permission="payments:create"
                fallback={
                  <div className="text-center p-8 border rounded-lg">
                    <p className="text-muted-foreground">You don't have permission to create payments</p>
                  </div>
                }
              >
                <PaymentForm />
              </PermissionGate>
            </div>
          )}
        </div>
      </RequireTenant>
    </DashboardLayout>
  );
};

export default Payments;
