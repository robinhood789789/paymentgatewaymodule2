import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
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
import { TenantSwitcher } from "@/components/TenantSwitcher";
import {
  LayoutDashboard,
  Building2,
  Shield,
  Webhook,
  AlertTriangle,
  RotateCcw,
  Settings,
  Activity,
  Users,
  DollarSign,
  FileText,
  BadgeCheck,
} from "lucide-react";

interface PlatformLayoutProps {
  children: ReactNode;
}

const platformMenuItems = [
  {
    title: "Dashboard",
    url: "/admin/super-admin",
    icon: LayoutDashboard,
  },
  {
    title: "Tenants",
    url: "/admin/tenants",
    icon: Building2,
  },
  {
    title: "Partners",
    url: "/platform/partners",
    icon: Users,
  },
  {
    title: "Security",
    url: "/platform/security",
    icon: Shield,
  },
  {
    title: "Providers",
    url: "/platform/providers",
    icon: BadgeCheck,
  },
  {
    title: "Events",
    url: "/platform/events",
    icon: Activity,
  },
  {
    title: "Webhooks",
    url: "/platform/webhooks",
    icon: Webhook,
  },
  {
    title: "Disputes",
    url: "/platform/disputes",
    icon: AlertTriangle,
  },
  {
    title: "Refunds",
    url: "/platform/refunds",
    icon: RotateCcw,
  },
  {
    title: "Settings",
    url: "/platform/settings",
    icon: Settings,
  },
  {
    title: "Status",
    url: "/platform/status",
    icon: Activity,
  },
  {
    title: "Audit",
    url: "/platform/audit",
    icon: FileText,
  },
];

const PlatformSidebar = () => {
  const { open } = useSidebar();

  return (
    <Sidebar className="border-r border-border" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {platformMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

const PlatformLayout = ({ children }: PlatformLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <PlatformSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 gap-4 sticky top-0 z-10">
            <SidebarTrigger />
            <TenantSwitcher />
          </header>
          
          <main className="flex-1 w-full">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PlatformLayout;
