import { useQuery } from "@tanstack/react-query";
import { api, Stats } from "@/lib/api";
import { useCases } from "@/hooks/useCases";
import { useScrapeJobs } from "@/hooks/useScrape";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Building2, FileText, TrendingUp, Clock } from "lucide-react";
import { Link } from "react-router-dom";

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.ElementType }) {
  return (
    <div className="border rounded-lg p-5 bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

const statusColors: Record<string, "success" | "warning" | "error" | "secondary"> = {
  done: "success",
  running: "warning",
  queued: "secondary",
  failed: "error",
};

export function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: api.stats.get });
  const { data: cases } = useCases({ per_page: 10, sort: "first_seen" });
  const { data: jobs } = useScrapeJobs();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Companies" value={stats?.total_companies ?? "—"} sub={`${stats?.active_companies ?? 0} active`} icon={Building2} />
        <StatCard label="Total Cases" value={stats?.total_cases ?? "—"} icon={FileText} />
        <StatCard label="New This Week" value={stats?.new_cases_this_week ?? "—"} icon={TrendingUp} />
        <StatCard label="Last Scrape" value={stats?.last_scrape ? formatDate(stats.last_scrape) : "Never"} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="border rounded-lg bg-card">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Recent Cases</h2>
            <Link to="/cases" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {cases?.items.length === 0 && (
              <p className="text-sm text-muted-foreground p-4">No cases yet.</p>
            )}
            {cases?.items.map((c) => (
              <Link key={c.id} to={`/cases/${c.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.title || c.url}</p>
                  <p className="text-xs text-muted-foreground">{c.customer_name || c.company_id} · {formatDate(c.first_seen)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="border rounded-lg bg-card">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold">Recent Scrape Jobs</h2>
          </div>
          <div className="divide-y">
            {!jobs?.length && (
              <p className="text-sm text-muted-foreground p-4">No jobs yet.</p>
            )}
            {jobs?.slice(0, 8).map((job) => (
              <div key={job.id} className="flex items-center gap-3 px-4 py-2">
                <Badge variant={statusColors[job.status] ?? "secondary"}>{job.status}</Badge>
                <span className="text-sm flex-1 truncate">{job.company_id ?? "All companies"}</span>
                <span className="text-xs text-muted-foreground">{job.cases_new} new</span>
                <span className="text-xs text-muted-foreground">{formatDate(job.started_at ?? job.finished_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
