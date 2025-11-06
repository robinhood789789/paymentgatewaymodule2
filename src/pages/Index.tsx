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
    <div className="min-h-screen bg-gradient-hero animate-gradient relative overflow-hidden">
      {/* Radial Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-radial-bright opacity-20 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-radial-bright opacity-20 blur-3xl pointer-events-none"></div>
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[80vh] relative z-10">
        <div className="text-center max-w-4xl mx-auto space-y-8 animate-in">
          {/* Icon */}
          <div className="mx-auto w-24 h-24 rounded-3xl bg-gradient-primary backdrop-blur-sm flex items-center justify-center mb-6 shadow-glow hover:scale-110 transition-all duration-300">
            <Shield className="w-12 h-12 text-white drop-shadow-lg" />
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight drop-shadow-2xl">
            Payment Management Platform
          </h1>
          
          <p className="text-xl md:text-2xl text-white/95 mb-8 font-light drop-shadow-lg">
            ระบบจัดการการชำระเงินสำหรับองค์กรที่ปลอดภัยและมีประสิทธิภาพ
          </p>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 mb-12">
            <Card className="group p-8 bg-gradient-subtle backdrop-blur-md border-white/30 shadow-glow hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-radial opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-info flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow transition-all">
                  <Lock className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-md">
                  Invite-Only System
                </h3>
                <p className="text-sm text-white/90 leading-relaxed drop-shadow-sm">
                  บัญชีทั้งหมดจะถูกสร้างโดย Administrator เท่านั้น
                </p>
              </div>
            </Card>

            <Card className="group p-8 bg-gradient-subtle backdrop-blur-md border-white/30 shadow-glow hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-radial opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow transition-all">
                  <Shield className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-md">
                  Enterprise Security
                </h3>
                <p className="text-sm text-white/90 leading-relaxed drop-shadow-sm">
                  ความปลอดภัยระดับองค์กร พร้อม 2FA และการเข้ารหัส SSL
                </p>
              </div>
            </Card>

            <Card className="group p-8 bg-gradient-subtle backdrop-blur-md border-white/30 shadow-glow hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-radial opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-users flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow transition-all">
                  <Users className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-md">
                  Multi-Tenant Support
                </h3>
                <p className="text-sm text-white/90 leading-relaxed drop-shadow-sm">
                  รองรับการจัดการหลายองค์กรในระบบเดียว
                </p>
              </div>
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
      <footer className="border-t border-white/20 py-10 px-4 backdrop-blur-md bg-white/5 relative z-10">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-sm text-white/80 font-light drop-shadow-md">
            © 2024 Payment Management Platform. ปลอดภัยด้วยการเข้ารหัส SSL
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
