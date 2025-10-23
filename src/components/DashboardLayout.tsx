import { ReactNode } from "react";
import * as React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useI18n } from "@/lib/i18n";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Settings,
  Users,
  LogOut,
  Shield,
  CreditCard,
  Link2,
  BarChart3,
  Book,
  Rocket,
  RefreshCw,
  UserCircle,
  Webhook,
  DollarSign,
  PieChart,
  ArrowDownToLine,
  ArrowUpFromLine,
  
  Receipt,
  KeyRound,
  Activity,
  Package,
  FileCheck,
  AlertCircle,
  UserCheck,
  Wallet,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardSidebar = () => {
  const { state } = useSidebar();
  const { signOut, isAdmin, isSuperAdmin, user } = useAuth();
  const { t } = useI18n();
  const isCollapsed = state === "collapsed";

  const { memberships, activeTenantId } = useTenantSwitcher();
  const isOwner = React.useMemo(() => {
    if (!memberships || !activeTenantId) {
      return false;
    }
    const membership = memberships.find((m: any) => m.tenant_id === activeTenantId);
    return membership?.roles?.name === 'owner';
  }, [memberships, activeTenantId]);

  const userMenuItems = [
    { title: t('dashboard.title'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('dashboard.reports'), url: "/reports", icon: BarChart3 },
  ];

  // Transaction menu items
  const transactionMenuItems = [
    { title: t('dashboard.deposit'), url: "/deposit-list", icon: ArrowDownToLine },
    { title: t('dashboard.withdrawal'), url: "/withdrawal-list", icon: ArrowUpFromLine },
    { title: t('dashboard.payments'), url: "/payments", icon: CreditCard },
  ];

  // Owner transaction items - System Deposit (Owner only, NOT for Super Admin)
  const ownerTransactionItems = (isOwner && !isSuperAdmin) ? [
    { title: "เติมเงินเข้าระบบ", url: "/system-deposit", icon: Wallet },
  ] : [];

  // Owner menu items (tenant-level management)
  const ownerMenuItems = isOwner ? [
    { title: "Members", url: "/admin/users", icon: Users },
    { title: "Roles & Permissions", url: "/roles-permissions", icon: KeyRound },
    { title: "Approvals", url: "/approvals", icon: Shield },
    { title: t('dashboard.activityHistory'), url: "/activity-history", icon: Activity },
  ] : [];

  // Management menu items
  const managementMenuItems = [
    { title: "Workbench", url: "/workbench", icon: Activity },
    { title: "Products", url: "/products", icon: Package },
    { title: "Payment Methods", url: "/payment-methods", icon: CreditCard },
    { title: "Reconciliation", url: "/reconciliation", icon: FileCheck },
    { title: "Disputes", url: "/disputes", icon: AlertCircle },
    { title: "KYC Verification", url: "/kyc-verification", icon: UserCheck },
    { title: t('dashboard.mdr'), url: "/mdr", icon: Receipt },
    { title: t('customers.title'), url: "/customers", icon: UserCircle },
    { title: t('webhookEvents.title'), url: "/webhook-events", icon: Webhook },
    { title: t('settlements.title'), url: "/settlements", icon: DollarSign },
  ];

  // Settings menu items
  const settingsMenuItems = [
    { title: t('dashboard.settings'), url: "/settings", icon: Settings },
    { title: 'API Docs', url: "/docs", icon: Book },
  ];

  // Go-Live for owners
  const goLiveItems = isOwner ? [
    { title: 'Go Live', url: "/go-live", icon: Rocket },
    { title: 'Controls Test', url: "/go-live/controls", icon: Shield },
    { title: 'Gap Report', url: "/reports/gap", icon: FileCheck },
    { title: 'Pyramid Model', url: "/pyramid-authority", icon: Shield },
    { title: 'Alerts', url: "/alerts", icon: AlertCircle },
  ] : [];

  const superAdminMenuItems = [
    { title: "Super Admin Console", url: "/admin", icon: Shield },
    { title: "Provision Merchant", url: "/admin/provision-merchant", icon: Users },
    { title: "Tenant Management", url: "/admin/tenants", icon: Users },
    { title: "Platform Audit", url: "/platform/audit", icon: Activity },
    { title: "Platform Security", url: "/platform/security", icon: Shield },
  ];

  // Debug menu - always available
  const debugMenuItems = [
    { title: "🔍 Auth Status Test", url: "/auth-status", icon: Activity },
  ];

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon" scrollWithContent>
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-semibold text-sm">SaaS Platform</h2>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Menu */}
        <SidebarGroup className="border-l-[6px] border-primary bg-primary/5 pl-3 py-2 rounded-r-lg">
          <SidebarGroupLabel className="text-primary font-semibold">{t('dashboard.overview')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[...userMenuItems, ...ownerMenuItems].map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Transaction Menu */}
        <SidebarGroup className="border-l-[6px] border-secondary bg-secondary/5 pl-3 py-2 rounded-r-lg">
          <SidebarGroupLabel className="text-secondary font-semibold">ธุรกรรม</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {transactionMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Owner Only: System Deposit */}
              {isOwner && ownerTransactionItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-primary text-green-800 font-bold shadow-md border-l-4 border-primary"
                          : "bg-primary/15 hover:bg-primary/25 border-l-4 border-primary/60 font-semibold text-green-700 shadow-sm hover:shadow-md transition-all"
                      }
                    >
                      <item.icon className="mr-2 h-5 w-5 text-black" />
                      {!isCollapsed && (
                        <span className="flex items-center gap-2">
                          {item.title}
                          <Badge variant="default" className="text-xs px-1.5 py-0 bg-green-700 text-white border border-green-800">Owner</Badge>
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Owner Menu (Tenant Management) */}
        {ownerMenuItems.length > 0 && (
          <SidebarGroup className="border-l-[6px] border-accent bg-accent/5 pl-3 py-2 rounded-r-lg">
            <SidebarGroupLabel className="text-accent font-semibold">Organization</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ownerMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "hover:bg-sidebar-accent/50"
                        }
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Management Menu */}
        <SidebarGroup className="border-l-[6px] border-warning bg-warning/5 pl-3 py-2 rounded-r-lg">
          <SidebarGroupLabel className="text-warning font-semibold">Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings & Docs */}
        <SidebarGroup className="border-l-[6px] border-accent bg-accent/5 pl-3 py-2 rounded-r-lg">
          <SidebarGroupContent>
            <SidebarMenu>
              {[...settingsMenuItems, ...goLiveItems].map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup className="border-l-[6px] border-destructive bg-destructive/5 pl-3 py-2 rounded-r-lg">
            <SidebarGroupLabel className="text-destructive font-semibold">Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "hover:bg-sidebar-accent/50"
                        }
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Debug Menu - Available for testing */}
        <SidebarGroup className="border-l-[6px] border-yellow-500 bg-yellow-500/5 pl-3 py-2 rounded-r-lg">
          <SidebarGroupLabel className="text-yellow-600 font-semibold">Debug</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {debugMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-sidebar-border space-y-3">
          {!isCollapsed && (
            <div className="space-y-2 mb-3">
              <p className="text-xs text-muted-foreground">Logged in as:</p>
              <p className="text-sm font-medium truncate">{user?.email}</p>
              {isSuperAdmin && (
                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-destructive/10 text-destructive">
                  Super Admin
                </span>
              )}
            </div>
          )}
          {!isCollapsed && <LocaleSwitcher />}
          <Button
            onClick={signOut}
            variant="destructive"
            className="w-full justify-start"
            size={isCollapsed ? "icon" : "default"}
          >
            <LogOut className={isCollapsed ? "" : "mr-2 h-4 w-4"} />
            {!isCollapsed && <span>{t('auth.signOut')}</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full overflow-x-auto">
        <div className="flex min-w-fit">
          <DashboardSidebar />
          
          <div className="flex-1 flex flex-col min-w-[800px]">
            <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 gap-4 sticky top-0 z-10">
              <SidebarTrigger />
              <TenantSwitcher />
            </header>
            
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
