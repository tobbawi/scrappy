import { useQuery } from "@tanstack/react-query";
import { api, Stats } from "@/lib/api";
import { useCases } from "@/hooks/useCases";
import { useScrapeJobs, useTriggerScrape } from "@/hooks/useScrape";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, timeAgo, isNewThisWeek } from "@/lib/utils";
import { Building2, FileText, RefreshCw, Clock, Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent: string; // tailwind border-l color class
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`border rounded-lg p-5 bg-card shadow-card border-l-4 ${accent}`}>
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function CompanyAvatar({ companyId }: { companyId: string }) {
  const initial = companyId.charAt(0).toUpperCase();
  return (
    <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 select-none">
      {initial}
    </div>
  );
}

const statusColors: Record<string, "success" | "warning" | "error" | "secondary"> = {
  done: "success",
  running: "warning",
  queued: "secondary",
  failed: "error",
};

const jobBorderColor: Record<string, string> = {
  done: "border-l-emerald-400",
  running: "border-l-amber-400",
  queued: "border-l-zinc-300",
  failed: "border-l-red-400",
};

export function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: api.stats.get });
  const { data: cases } = useCases({ per_page: 10, sort: "first_seen" });
  const { data: jobs } = useScrapeJobs();
  const { mutate: triggerAll, isPending: isScraping } = useTriggerScrape();

  const newCount = stats?.new_cases_this_week ?? 0;
  const companiesWithNew = jobs?.filter((j) => j.status === "done" && j.cases_new > 0).length ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button
          size="sm"
          onClick={() => triggerAll("all")}
          disabled={isScraping}
          className="gap-1.5"
        >
          <Zap className={`h-4 w-4 ${isScraping ? "animate-pulse" : ""}`} />
          {isScraping ? "Scraping…" : "Run scrape now"}
        </Button>
      </div>

      {/* Hero banner — new cases this week */}
      {newCount > 0 && (
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-5 py-4 flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <div>
            <p className="font-semibold text-indigo-900">
              {newCount} new case{newCount !== 1 ? "s" : ""} this week
            </p>
            <p className="text-sm text-indigo-600 mt-0.5">
              Since last Friday
              {companiesWithNew > 0 ? ` · ${companiesWithNew} compan${companiesWithNew === 1 ? "y" : "ies"}` : ""}
            </p>
          </div>
          <Link to="/cases?new_only=true" className="ml-auto text-sm text-indigo-600 hover:underline">
            View new →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Cases"
          value={stats?.total_cases ?? "—"}
          sub={`${newCount} new this week`}
          accent="border-l-indigo-400"
        />
        <StatCard
          label="New This Week"
          value={newCount}
          accent="border-l-emerald-400"
        />
        <StatCard
          label="Companies"
          value={stats?.total_companies ?? "—"}
          sub={`${stats?.active_companies ?? 0} active`}
          accent="border-l-zinc-300"
        />
        <StatCard
          label="Last Scrape"
          value={stats?.last_scrape ? timeAgo(stats.last_scrape) : "Never"}
          sub={stats?.last_scrape ? formatDate(stats.last_scrape) : undefined}
          accent="border-l-zinc-300"
        />
      </div>

      {/* Company status breakdown */}
      {stats?.companies_by_status && Object.keys(stats.companies_by_status).length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Companies:</span>
          {Object.entries(stats.companies_by_status).map(([status, count]) => (
            <span key={status} className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  status === "running"
                    ? "bg-amber-400"
                    : status === "success"
                    ? "bg-emerald-500"
                    : status === "error"
                    ? "bg-red-500"
                    : "bg-zinc-300"
                }`}
              />
              <span className="text-muted-foreground">
                {count} {status}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="border rounded-lg bg-card shadow-card">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Recent Cases</h2>
            <Link to="/cases" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {cases?.items.length === 0 && (
              <p className="text-sm text-muted-foreground p-4">No cases yet.</p>
            )}
            {cases?.items.map((c) => {
              const isNew = isNewThisWeek(c.first_seen);
              return (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors"
                >
                  <CompanyAvatar companyId={c.company_id} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.title || c.url}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.customer_name || c.company_id}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {isNew && <Badge variant="new">NEW</Badge>}
                    <span className="text-xs text-muted-foreground">{timeAgo(c.first_seen)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="border rounded-lg bg-card shadow-card">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold">Recent Scrape Jobs</h2>
          </div>
          <div className="divide-y">
            {!jobs?.length && (
              <p className="text-sm text-muted-foreground p-4">No jobs yet.</p>
            )}
            {jobs?.slice(0, 8).map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className={`flex items-center gap-3 px-4 py-2 hover:bg-accent/50 transition-colors border-l-4 ${jobBorderColor[job.status] ?? "border-l-zinc-200"}`}
              >
                <Badge variant={statusColors[job.status] ?? "secondary"} className="shrink-0">
                  {job.status}
                </Badge>
                <span className="text-sm flex-1 truncate">{job.company_id ?? "All companies"}</span>
                {job.cases_new > 0 && (
                  <span className="text-xs font-medium text-emerald-600 shrink-0">+{job.cases_new}</span>
                )}
                <span className="text-xs text-muted-foreground shrink-0">
                  {timeAgo(job.started_at ?? job.finished_at)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
