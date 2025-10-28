import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { RequireTenant } from "@/components/RequireTenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Bell, CheckCircle, Play, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { use2FAChallenge } from "@/hooks/use2FAChallenge";
import { TwoFactorChallenge } from "@/components/security/TwoFactorChallenge";
import { format } from "date-fns";

const alertTemplates = [
  {
    id: "excessive_refunds",
    name: "Excessive Refunds",
    description: "Alert when refunds by single admin exceed threshold",
    defaultConfig: { threshold: 5, window_hours: 1 },
  },
  {
    id: "excessive_exports",
    name: "Excessive Data Exports",
    description: "Alert when exports exceed daily limit",
    defaultConfig: { threshold: 10, window_hours: 24 },
  },
  {
    id: "api_key_outside_hours",
    name: "API Key Creation Outside Hours",
    description: "Alert when API keys created outside business hours",
    defaultConfig: { start_hour: 9, end_hour: 18 },
  },
  {
    id: "new_login_location",
    name: "New Login Location",
    description: "Alert on login from new country/IP",
    defaultConfig: { track_countries: true, track_ips: true },
  },
  {
    id: "failed_mfa_attempts",
    name: "Failed MFA Attempts",
    description: "Alert on multiple failed MFA verifications",
    defaultConfig: { threshold: 3, window_hours: 1 },
  },
];

export default function AlertManagement() {
  const { activeTenantId } = useTenantSwitcher();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMetadata, setAlertMetadata] = useState("{}");
  const { isOpen, setIsOpen, checkAndChallenge, onSuccess } = use2FAChallenge();

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["alerts", activeTenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("tenant_id", activeTenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId,
  });

  const { data: alertEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["alert-events", activeTenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_events")
        .select(`
          *,
          alerts!inner(title, tenant_id)
        `)
        .eq("alerts.tenant_id", activeTenantId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId,
  });

  const evaluateAlertsMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("alerts-evaluate", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "X-Tenant": activeTenantId!,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Evaluated ${data.evaluated_count} rules, triggered ${data.triggered_count} alerts`);
      queryClient.invalidateQueries({ queryKey: ["alert-events"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to evaluate alerts");
    },
  });

  const handleEvaluateNow = () => {
    checkAndChallenge(() => evaluateAlertsMutation.mutate());
  };

  const createAlertMutation = useMutation({
    mutationFn: async () => {
      let metadata;
      try {
        metadata = JSON.parse(alertMetadata);
      } catch (e) {
        throw new Error("Invalid JSON configuration");
      }

      const { error } = await supabase.from("alerts").insert({
        tenant_id: activeTenantId,
        title: alertTitle,
        alert_type: selectedTemplate,
        severity: "medium",
        message: `Alert rule: ${alertTitle}`,
        metadata,
        resolved: false,
      });

      if (error) throw error;

      // Audit log
      await supabase.from("audit_logs").insert({
        tenant_id: activeTenantId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "alert_rule_created",
        resource_type: "alert",
        metadata: { title: alertTitle, type: selectedTemplate },
      });
    },
    onSuccess: () => {
      toast.success("Alert rule created successfully");
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setIsCreateOpen(false);
      setSelectedTemplate("");
      setAlertTitle("");
      setAlertMetadata("{}");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create alert rule");
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.from("alerts").delete().eq("id", alertId);
      if (error) throw error;

      // Audit log
      await supabase.from("audit_logs").insert({
        tenant_id: activeTenantId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "alert_rule_deleted",
        resource_type: "alert",
        resource_id: alertId,
      });
    },
    onSuccess: () => {
      toast.success("Alert rule deleted");
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete alert");
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    const template = alertTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setAlertTitle(template.name);
      setAlertMetadata(JSON.stringify(template.defaultConfig, null, 2));
    }
  };

  const handleCreateRule = () => {
    if (!alertTitle || !selectedTemplate) {
      toast.error("Please fill in all required fields");
      return;
    }
    checkAndChallenge(() => createAlertMutation.mutate());
  };

  const handleDeleteRule = (alertId: string) => {
    checkAndChallenge(() => deleteAlertMutation.mutate(alertId));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 text-red-500";
      case "high":
        return "bg-orange-500/10 text-orange-500";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500";
      case "low":
        return "bg-blue-500/10 text-blue-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const filteredAlerts = alerts?.filter(alert =>
    alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.alert_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <RequireTenant>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Bell className="h-8 w-8" />
                Alert Management
              </h1>
              <p className="text-muted-foreground">
                Configure security alerts and review incidents
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEvaluateNow} variant="outline" disabled={evaluateAlertsMutation.isPending}>
                <Play className="mr-2 h-4 w-4" />
                {evaluateAlertsMutation.isPending ? "Evaluating..." : "Evaluate Now"}
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Alert Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Alert Rule</DialogTitle>
                    <DialogDescription>
                      Select a template or create a custom alert rule
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Template</Label>
                      <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {alertTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTemplate && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {alertTemplates.find(t => t.id === selectedTemplate)?.description}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Alert Title</Label>
                      <Input
                        value={alertTitle}
                        onChange={(e) => setAlertTitle(e.target.value)}
                        placeholder="e.g., Excessive Refunds by Admin"
                      />
                    </div>
                    <div>
                      <Label>Configuration (JSON)</Label>
                      <Textarea
                        value={alertMetadata}
                        onChange={(e) => setAlertMetadata(e.target.value)}
                        placeholder='{"threshold": 5, "window_hours": 1}'
                        className="font-mono text-sm"
                        rows={6}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateRule}
                      disabled={!alertTitle || !selectedTemplate || createAlertMutation.isPending}
                    >
                      {createAlertMutation.isPending ? "Creating..." : "Create Rule"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Tabs defaultValue="rules" className="space-y-4">
            <TabsList>
              <TabsTrigger value="rules">Alert Rules</TabsTrigger>
              <TabsTrigger value="incidents">Incidents</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Active Alert Rules</CardTitle>
                      <CardDescription>
                        Monitoring rules for security anomalies
                      </CardDescription>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search rules..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {alertsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : filteredAlerts?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No alert rules configured
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAlerts?.map((alert) => (
                        <div
                          key={alert.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`p-2 rounded ${alert.resolved ? 'bg-muted' : 'bg-orange-100 dark:bg-orange-950'}`}>
                              <AlertTriangle className={`h-5 w-5 ${alert.resolved ? 'text-muted-foreground' : 'text-orange-600'}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{alert.title}</h4>
                                <Badge className={getSeverityColor(alert.severity)}>
                                  {alert.severity}
                                </Badge>
                                {alert.resolved && (
                                  <Badge variant="outline" className="text-green-600">
                                    Resolved
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Type: {alert.alert_type} • Created: {format(new Date(alert.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteRule(alert.id)}
                              disabled={deleteAlertMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            {!alert.resolved && (
                              <Button variant="outline" size="sm">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="incidents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Incidents</CardTitle>
                  <CardDescription>Alert events and security incidents</CardDescription>
                </CardHeader>
                <CardContent>
                  {eventsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : alertEvents?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No incidents recorded
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alertEvents?.map((event: any) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <div>
                              <div className="font-medium">{event.event_type}</div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(event.created_at), 'MMM d, yyyy HH:mm:ss')}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {alertTemplates.map((template) => (
                  <Card key={template.id} className="hover:border-primary transition-colors">
                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          Default configuration:
                        </div>
                        <pre className="text-xs bg-muted p-2 rounded">
                          {JSON.stringify(template.defaultConfig, null, 2)}
                        </pre>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            handleTemplateSelect(template.id);
                            setIsCreateOpen(true);
                          }}
                        >
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <TwoFactorChallenge
          open={isOpen}
          onOpenChange={setIsOpen}
          onSuccess={onSuccess}
          title="Verify 2FA"
          description="Enter your 6-digit code to evaluate alerts"
        />
      </RequireTenant>
    </DashboardLayout>
  );
}
