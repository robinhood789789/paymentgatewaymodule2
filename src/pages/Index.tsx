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
    <div className="min-h-screen bg-gradient-hero animate-gradient">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-4xl mx-auto space-y-8 animate-in">
          {/* Icon */}
          <div className="mx-auto w-24 h-24 rounded-3xl bg-gradient-primary backdrop-blur-sm flex items-center justify-center mb-6 shadow-glow hover:scale-110 transition-all duration-300">
            <Shield className="w-12 h-12 text-white" />
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Payment Management Platform
          </h1>
          
          <p className="text-xl md:text-2xl text-white/95 mb-8 font-light">
            ระบบจัดการการชำระเงินสำหรับองค์กรที่ปลอดภัยและมีประสิทธิภาพ
          </p>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 mb-12">
            <Card className="group p-8 bg-gradient-subtle backdrop-blur-md border-white/30 shadow-glow hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-white/30 transition-colors">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Invite-Only System
              </h3>
              <p className="text-sm text-white/90 leading-relaxed">
                บัญชีทั้งหมดจะถูกสร้างโดย Administrator เท่านั้น
              </p>
            </Card>

            <Card className="group p-8 bg-gradient-subtle backdrop-blur-md border-white/30 shadow-glow hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-white/30 transition-colors">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Enterprise Security
              </h3>
              <p className="text-sm text-white/90 leading-relaxed">
                ความปลอดภัยระดับองค์กร พร้อม 2FA และการเข้ารหัส SSL
              </p>
            </Card>

            <Card className="group p-8 bg-gradient-subtle backdrop-blur-md border-white/30 shadow-glow hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-white/30 transition-colors">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Multi-Tenant Support
              </h3>
              <p className="text-sm text-white/90 leading-relaxed">
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
              className="text-xl px-12 py-7 bg-white text-primary hover:bg-white/95 shadow-elegant hover:shadow-glow hover:scale-105 transition-all duration-300 font-semibold"
            >
              เข้าสู่ระบบ
            </Button>
            
            <p className="text-base text-white/80 font-light">
              หากคุณได้รับ invitation code กรุณาติดต่อ Administrator
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/20 py-10 px-4 backdrop-blur-md bg-white/5">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-sm text-white/80 font-light">
            © 2024 Payment Management Platform. ปลอดภัยด้วยการเข้ารหัส SSL
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
