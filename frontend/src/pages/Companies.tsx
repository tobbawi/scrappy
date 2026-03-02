import { useCompanies, useDeleteCompany, useUpdateCompany } from "@/hooks/useCompanies";
import { useTriggerScrape } from "@/hooks/useScrape";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { EditCompanyDialog } from "@/components/companies/EditCompanyDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";
import { RefreshCw, Trash2, ExternalLink, ToggleLeft, ToggleRight, Zap } from "lucide-react";
import type { Company } from "@/lib/api";

const statusDot: Record<string, string> = {
  idle: "bg-zinc-300",
  running: "bg-amber-400 animate-pulse",
  success: "bg-emerald-500",
  error: "bg-red-500",
};

const fetcherLabel: Record<string, string> = {
  static: "⚡ Static",
  dynamic: "🎭 Dynamic",
  stealthy: "🥷 Stealthy",
};

function CompanyRow({ company }: { company: Company }) {
  const { mutate: triggerScrape, isPending: isScraping } = useTriggerScrape();
  const { mutate: deleteCompany } = useDeleteCompany();
  const { mutate: updateCompany } = useUpdateCompany();

  const onError = (err: Error) => alert(err.message);

  return (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${statusDot[company.scrape_status] ?? "bg-zinc-300"}`}
            title={company.scrape_status}
          />
          <div>
            <div className="font-medium">{company.name}</div>
            <div className="text-xs text-muted-foreground">{company.id}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <a
          href={company.listing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1 max-w-xs truncate"
        >
          <span className="truncate">{company.listing_url}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {fetcherLabel[company.fetcher_type] ?? company.fetcher_type}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              company.scrape_status === "success"
                ? "success"
                : company.scrape_status === "running"
                ? "warning"
                : company.scrape_status === "error"
                ? "error"
                : "outline"
            }
          >
            {company.scrape_status}
          </Badge>
          {company.error_message && (
            <span
              title={company.error_message}
              className="h-4 w-4 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center cursor-help font-bold shrink-0"
            >
              !
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {timeAgo(company.last_scraped_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            title={company.active ? "Disable" : "Enable"}
            onClick={() => updateCompany({ id: company.id, data: { active: !company.active } }, { onError })}
          >
            {company.active ? (
              <ToggleRight className="h-4 w-4 text-emerald-600" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <EditCompanyDialog company={company} />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            disabled={isScraping || company.scrape_status === "running"}
            onClick={() => triggerScrape(company.id, { onError })}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScraping ? "animate-spin" : ""}`} />
            Scrape
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(`Delete ${company.name}?`)) deleteCompany(company.id, { onError });
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function Companies() {
  const { data, isLoading } = useCompanies();
  const companies = data?.items;
  const { mutate: triggerAll, isPending } = useTriggerScrape();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Companies</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => triggerAll("all")} disabled={isPending} className="gap-1.5">
            <Zap className={`h-4 w-4 ${isPending ? "animate-pulse" : ""}`} />
            Scrape All
          </Button>
          <AddCompanyDialog />
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      {!isLoading && (
        <div className="border rounded-lg overflow-hidden bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Company</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Listing URL</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Fetcher</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Last scraped</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!companies?.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No companies added yet. Add one to get started.
                  </td>
                </tr>
              )}
              {companies?.map((company) => (
                <CompanyRow key={company.id} company={company} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
