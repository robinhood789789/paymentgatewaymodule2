import { ReactNode } from "react";
import * as React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
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
  PlusCircle,
  Receipt,
  KeyRound,
  Activity
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardSidebar = () => {
  const { state } = useSidebar();
  const { signOut, isAdmin, user } = useAuth();
  const { t } = useI18n();
  const isCollapsed = state === "collapsed";

  // Check if user is owner
  const [isOwner, setIsOwner] = React.useState(false);
  
  React.useEffect(() => {
    const checkOwner = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('memberships')
        .select('role_id, roles(name)')
        .eq('user_id', user.id)
        .single();
      setIsOwner((data as any)?.roles?.name === 'owner');
    };
    checkOwner();
  }, [user]);

  const userMenuItems = [
    { title: t('dashboard.title'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('dashboard.reports'), url: "/reports", icon: BarChart3 },
  ];

  // Owner-only menu items
  const ownerMenuItems = isOwner ? [
    { title: t('dashboard.summaryReport'), url: "/summary-report", icon: PieChart },
  ] : [];

  // Transaction menu items
  const transactionMenuItems = [
    { title: t('dashboard.deposit'), url: "/deposit-list", icon: ArrowDownToLine },
    { title: t('dashboard.withdrawal'), url: "/withdrawal-list", icon: ArrowUpFromLine },
    { title: t('dashboard.payments'), url: "/payments", icon: CreditCard },
  ];

  // Owner transaction items
  const ownerTransactionItems = isOwner ? [
    { title: t('dashboard.systemDeposit'), url: "/system-deposit", icon: PlusCircle },
  ] : [];

  // Management menu items
  const managementMenuItems = [
    { title: t('dashboard.mdr'), url: "/mdr", icon: Receipt },
    { title: t('customers.title'), url: "/customers", icon: UserCircle },
    { title: t('dashboard.rolesPermissions'), url: "/roles-permissions", icon: KeyRound },
    { title: t('webhookEvents.title'), url: "/webhook-events", icon: Webhook },
    { title: t('settlements.title'), url: "/settlements", icon: DollarSign },
    { title: t('dashboard.activityHistory'), url: "/activity-history", icon: Activity },
  ];

  // Settings menu items
  const settingsMenuItems = [
    { title: t('dashboard.settings'), url: "/settings", icon: Settings },
    { title: 'API Docs', url: "/docs", icon: Book },
  ];

  // Go-Live for owners
  const goLiveItems = isOwner ? [
    { title: 'Go Live', url: "/go-live", icon: Rocket },
  ] : [];

  const adminMenuItems = [
    { title: t('dashboard.admin'), url: "/admin/users", icon: Users },
  ];

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"}>
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
        <SidebarGroup>
          <SidebarGroupLabel>{t('dashboard.overview')}</SidebarGroupLabel>
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
        <SidebarGroup>
          <SidebarGroupLabel>ธุรกรรม</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[...transactionMenuItems, ...ownerTransactionItems].map((item) => (
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

        {/* Management Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>จัดการ</SidebarGroupLabel>
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
        <SidebarGroup>
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

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('dashboard.admin')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
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

        <div className="mt-auto p-4 border-t border-sidebar-border space-y-3">
          {!isCollapsed && <LocaleSwitcher />}
          <Button
            onClick={signOut}
            variant="ghost"
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
      <div className="flex min-h-screen w-full">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 gap-4">
            <SidebarTrigger />
            <TenantSwitcher />
          </header>
          
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
