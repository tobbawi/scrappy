import { NavLink } from "react-router-dom";
import { LayoutDashboard, Building2, FileText, Newspaper, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrapeJobs } from "@/hooks/useScrape";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/cases", label: "Cases", icon: FileText },
  { to: "/digest", label: "Digest", icon: Newspaper },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { data: jobs } = useScrapeJobs();
  const hasRunningJob = jobs?.some((j) => j.status === "running" || j.status === "queued") ?? false;

  return (
    <aside className="w-52 shrink-0 flex flex-col" style={{ background: "hsl(var(--sidebar))" }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold text-sm select-none">
          S
        </div>
        <span className="font-bold text-base text-white tracking-tight">Scrappy</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 space-y-2">
        {hasRunningJob && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <span className="text-xs text-amber-400">Scraping…</span>
          </div>
        )}
        <p className="text-xs text-zinc-600">Scrappy v0.1.0</p>
      </div>
    </aside>
  );
}
