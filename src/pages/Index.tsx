import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useShareholder } from "@/hooks/useShareholder";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isShareholder, isLoading: shLoading } = useShareholder();

  useEffect(() => {
    if (user && !shLoading) {
      navigate(isShareholder ? "/shareholder/dashboard" : "/dashboard");
    }
  }, [user, isShareholder, shLoading, navigate]);


  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6 shadow-glow">
            <Shield className="w-10 h-10 text-white" />
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Payment Management Platform
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8">
            ระบบจัดการการชำระเงินสำหรับองค์กรที่ปลอดภัยและมีประสิทธิภาพ
          </p>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 mb-12">
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 shadow-glow">
              <Lock className="w-8 h-8 text-white mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Invite-Only System
              </h3>
              <p className="text-sm text-white/80">
                บัญชีทั้งหมดจะถูกสร้างโดย Administrator เท่านั้น
              </p>
            </Card>

            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 shadow-glow">
              <Shield className="w-8 h-8 text-white mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Enterprise Security
              </h3>
              <p className="text-sm text-white/80">
                ความปลอดภัยระดับองค์กร พร้อม 2FA และการเข้ารหัส SSL
              </p>
            </Card>

            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 shadow-glow">
              <Users className="w-8 h-8 text-white mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Multi-Tenant Support
              </h3>
              <p className="text-sm text-white/80">
                รองรับการจัดการหลายองค์กรในระบบเดียว
              </p>
            </Card>
          </div>

          {/* CTA Button */}
          <div className="space-y-4">
            <Button
              variant="default"
              size="lg"
              onClick={() => navigate("/auth/sign-in")}
              className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90 shadow-elegant"
            >
              เข้าสู่ระบบ
            </Button>
            
            <p className="text-sm text-white/70">
              หากคุณได้รับ invitation code กรุณาติดต่อ Administrator
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 backdrop-blur-sm">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-sm text-white/70">
            © 2024 Payment Management Platform. ปลอดภัยด้วยการเข้ารหัส SSL
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
