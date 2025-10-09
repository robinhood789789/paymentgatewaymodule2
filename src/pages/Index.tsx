import PaymentHero from "@/components/PaymentHero";
import ProductCard from "@/components/ProductCard";
import PaymentForm from "@/components/PaymentForm";
import { useState } from "react";

const Index = () => {
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
    <div className="min-h-screen">
      <PaymentHero />

      {!showPaymentForm ? (
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                เลือกแพ็กเกจที่เหมาะกับคุณ
              </h2>
              <p className="text-lg text-muted-foreground">
                เริ่มต้นฟรี ไม่มีค่าธรรมเนียมแอบแฝง ยกเลิกได้ตลอดเวลา
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {products.map((product, index) => (
                <ProductCard
                  key={index}
                  {...product}
                  onSelect={() => setShowPaymentForm(true)}
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-8">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-primary hover:underline mb-4"
              >
                ← กลับไปเลือกแพ็กเกจ
              </button>
            </div>
            <PaymentForm />
          </div>
        </section>
      )}

      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Payment Platform. ปลอดภัยด้วยการเข้ารหัส SSL และ PCI DSS Certified
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
