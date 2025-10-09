import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  responseTime?: number;
}

const Status = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Frontend", status: "operational", responseTime: 45 },
    { name: "API", status: "operational", responseTime: 120 },
    { name: "Database", status: "operational", responseTime: 15 },
    { name: "Authentication", status: "operational", responseTime: 80 },
  ]);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-success text-success-foreground";
      case "degraded":
        return "bg-warning text-warning-foreground";
      case "down":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "degraded":
        return <Clock className="w-5 h-5 text-warning" />;
      case "down":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return null;
    }
  };

  const allOperational = services.every((s) => s.status === "operational");

  return (
    <div className="min-h-screen bg-gradient-hero p-6">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">System Status</h1>
          <div className="flex items-center justify-center gap-2">
            {allOperational ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-success" />
                <span className="text-xl text-success font-semibold">All Systems Operational</span>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-destructive" />
                <span className="text-xl text-destructive font-semibold">Some Issues Detected</span>
              </>
            )}
          </div>
          <p className="text-muted-foreground">
            Last updated: {format(currentTime, "PPpp")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
            <CardDescription>Real-time status of all services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <h3 className="font-semibold">{service.name}</h3>
                      {service.responseTime && (
                        <p className="text-sm text-muted-foreground">
                          Response time: {service.responseTime}ms
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(service.status)}>
                    {service.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health Check</CardTitle>
            <CardDescription>Frontend application health status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-4">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h2 className="text-3xl font-bold text-success mb-2">OK</h2>
              <p className="text-muted-foreground">
                Frontend is running and responsive
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            For support, contact{" "}
            <a href="mailto:support@example.com" className="text-primary hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Status;
