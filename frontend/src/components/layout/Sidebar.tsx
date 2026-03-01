import { NavLink } from "react-router-dom";
import { LayoutDashboard, Building2, FileText, Newspaper, Settings, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/cases", label: "Cases", icon: FileText },
  { to: "/digest", label: "Digest", icon: Newspaper },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r bg-muted/30 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-5 border-b">
        <RefreshCw className="h-5 w-5 text-primary" />
        <span className="font-bold text-lg tracking-tight">Scrappy</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground">
        Scrappy v0.1.0
      </div>
    </aside>
  );
}
