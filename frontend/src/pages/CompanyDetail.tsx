import { useParams, Link, useNavigate } from "react-router-dom";
import { useCompany, useDeleteCompany, useUpdateCompany } from "@/hooks/useCompanies";
import { useScrapeJobs, useTriggerScrape } from "@/hooks/useScrape";
import { EditCompanyDialog } from "@/components/companies/EditCompanyDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, timeAgo } from "@/lib/utils";
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { CompanyFavicon } from "@/components/CompanyFavicon";

const statusVariant: Record<string, "success" | "warning" | "error" | "outline"> = {
  success: "success",
  running: "warning",
  error: "error",
  idle: "outline",
};

const fetcherLabel: Record<string, string> = {
  static: "Static",
  dynamic: "Dynamic",
  stealthy: "Stealthy",
};

function qualityColor(score: number) {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

function qualityBg(score: number) {
  if (score >= 70) return "bg-emerald-50 border-emerald-200";
  if (score >= 40) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function jobStatusBadge(status: string) {
  switch (status) {
    case "done":
      return <Badge variant="success">done</Badge>;
    case "failed":
      return <Badge variant="error">failed</Badge>;
    case "running":
      return <Badge variant="warning">running</Badge>;
    case "queued":
      return <Badge variant="outline">queued</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading, error } = useCompany(id!);
  const { data: jobs } = useScrapeJobs(id);
  const { mutate: triggerScrape, isPending: isScraping } = useTriggerScrape();
  const { mutate: deleteCompany } = useDeleteCompany();

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/companies" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Companies
        </Link>
        <p className="text-destructive">Company not found.</p>
      </div>
    );
  }

  const recentJobs = (jobs ?? []).slice(0, 10);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="space-y-4">
        <Link to="/companies" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Companies
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CompanyFavicon url={company.listing_url} name={company.name} size={32} />
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <Badge variant={company.active ? "success" : "outline"}>
              {company.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <EditCompanyDialog company={company} />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={isScraping || company.scrape_status === "running"}
              onClick={() => triggerScrape(company.id)}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScraping ? "animate-spin" : ""}`} />
              Scrape Now
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete ${company.name} and all its cases?`)) {
                  deleteCompany(company.id, {
                    onSuccess: () => navigate("/companies"),
                  });
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-sm text-muted-foreground">Cases</div>
          <div className="text-2xl font-bold">{company.case_count}</div>
        </div>
        <div className={`border rounded-lg p-4 ${qualityBg(company.avg_quality_score)}`}>
          <div className="text-sm text-muted-foreground">Avg Quality</div>
          <div className={`text-2xl font-bold ${qualityColor(company.avg_quality_score)}`}>
            {company.avg_quality_score}
          </div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-sm text-muted-foreground">Fetcher Type</div>
          <div className="text-2xl font-bold">{fetcherLabel[company.fetcher_type] ?? company.fetcher_type}</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-sm text-muted-foreground">Last Scraped</div>
          <div className="text-lg font-semibold">{timeAgo(company.last_scraped_at)}</div>
        </div>
      </div>

      {/* Error Banner */}
      {company.scrape_status === "error" && company.error_message && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-red-800">Scrape Error</div>
            <div className="text-sm text-red-700 mt-1">{company.error_message}</div>
          </div>
        </div>
      )}

      {/* Company Info + Top Industries/Countries */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-lg bg-card">
          <div className="px-4 py-3 border-b font-medium text-sm">Company Info</div>
          <dl className="divide-y text-sm">
            <div className="px-4 py-2.5 flex justify-between">
              <dt className="text-muted-foreground">Listing URL</dt>
              <dd>
                <a
                  href={company.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span className="max-w-[200px] truncate">{company.listing_url}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </dd>
            </div>
            {company.case_path_prefix && (
              <div className="px-4 py-2.5 flex justify-between">
                <dt className="text-muted-foreground">Path prefix</dt>
                <dd className="font-mono text-xs">{company.case_path_prefix}</dd>
              </div>
            )}
            <div className="px-4 py-2.5 flex justify-between">
              <dt className="text-muted-foreground">Company ID</dt>
              <dd className="font-mono text-xs">{company.id}</dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(company.created_at)}</dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge variant={statusVariant[company.scrape_status] ?? "outline"}>
                  {company.scrape_status}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4">
          {company.top_industries.length > 0 && (
            <div className="border rounded-lg bg-card">
              <div className="px-4 py-3 border-b font-medium text-sm">Top Industries</div>
              <ul className="divide-y text-sm">
                {company.top_industries.map((item) => (
                  <li key={item.name} className="px-4 py-2 flex justify-between">
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {company.top_countries.length > 0 && (
            <div className="border rounded-lg bg-card">
              <div className="px-4 py-3 border-b font-medium text-sm">Top Countries</div>
              <ul className="divide-y text-sm">
                {company.top_countries.map((item) => (
                  <li key={item.name} className="px-4 py-2 flex justify-between">
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Scrape History */}
      <div className="border rounded-lg bg-card">
        <div className="px-4 py-3 border-b font-medium text-sm">
          Scrape History {recentJobs.length > 0 && `(last ${recentJobs.length})`}
        </div>
        {recentJobs.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No scrape jobs yet.
          </div>
        ) : (
          <ul className="divide-y text-sm">
            {recentJobs.map((job) => (
              <li key={job.id} className="px-4 py-2.5 flex items-center gap-3">
                {jobStatusBadge(job.status)}
                <span className="text-muted-foreground w-24 shrink-0">
                  {formatDate(job.started_at)}
                </span>
                {job.status === "done" ? (
                  <span>
                    {job.cases_found} found
                    {job.cases_new > 0 && (
                      <span className="text-emerald-600 ml-1">+{job.cases_new} new</span>
                    )}
                  </span>
                ) : job.status === "failed" && job.error ? (
                  <span className="text-red-600 truncate">{job.error}</span>
                ) : (
                  <span className="text-muted-foreground">{job.status}</span>
                )}
                <Link
                  to={`/jobs/${job.id}`}
                  className="ml-auto text-xs text-primary hover:underline shrink-0"
                >
                  Details
                </Link>
              </li>
            ))}
          </ul>
        )}
        {company.case_count > 0 && (
          <div className="px-4 py-3 border-t">
            <Link
              to={`/cases?company=${company.id}`}
              className="text-sm text-primary hover:underline"
            >
              View all {company.case_count} cases →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
