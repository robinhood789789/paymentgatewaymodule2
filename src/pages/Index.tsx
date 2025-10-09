import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import PaymentHero from "@/components/PaymentHero";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

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
      ],
    },
    {
      title: "Business",
      price: "฿999",
      period: "เดือน",
      features: [
        "รับชำระเงินได้ไม่จำกัด",
        "ค่าธรรมเนียม 2.5%",
        "รองรับทุกช่องทาง",
        "รายงานขั้นสูง + Analytics",
        "API Integration",
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
        "Account Manager",
        "Custom Integration",
        "Priority Support",
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      <PaymentHero />

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              เลือกแพ็กเกจที่เหมาะกับคุณ
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              เริ่มต้นฟรี ไม่มีค่าธรรมเนียมแอบแฝง ยกเลิกได้ตลอดเวลา
            </p>
            <Button
              variant="gradient"
              size="lg"
              onClick={() => navigate("/auth")}
              className="gap-2"
            >
              เริ่มใช้งานเลย
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {products.map((product, index) => (
              <ProductCard
                key={index}
                {...product}
                onSelect={() => navigate("/auth")}
              />
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 SaaS Platform. ปลอดภัยด้วยการเข้ารหัส SSL
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
