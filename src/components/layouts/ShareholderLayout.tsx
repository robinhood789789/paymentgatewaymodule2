import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, Users, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "ภาพรวม", path: "/shareholder/overview" },
  { icon: Users, label: "ทีมงาน", path: "/shareholder/team" },
  { icon: FileText, label: "รายงาน", path: "/shareholder/reports" },
  { icon: Settings, label: "ตั้งค่า", path: "/shareholder/settings" },
];

export default function ShareholderLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Persistent Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Shareholder Portal</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
