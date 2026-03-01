import { useCompanies, useDeleteCompany, useUpdateCompany } from "@/hooks/useCompanies";
import { useTriggerScrape } from "@/hooks/useScrape";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { RefreshCw, Trash2, ExternalLink, ToggleLeft, ToggleRight } from "lucide-react";
import type { Company } from "@/lib/api";

const statusVariant: Record<string, "success" | "warning" | "error" | "secondary" | "outline"> = {
  idle: "outline",
  running: "warning",
  success: "success",
  error: "error",
};

function CompanyRow({ company }: { company: Company }) {
  const { mutate: triggerScrape, isPending: isScraping } = useTriggerScrape();
  const { mutate: deleteCompany } = useDeleteCompany();
  const { mutate: updateCompany } = useUpdateCompany();

  return (
    <tr className="border-b hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="font-medium">{company.name}</div>
        <div className="text-xs text-muted-foreground truncate max-w-xs">{company.id}</div>
      </td>
      <td className="px-4 py-3">
        <a href={company.listing_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
          <span className="truncate max-w-xs">{company.listing_url}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </td>
      <td className="px-4 py-3">
        <Badge variant="secondary">{company.fetcher_type}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant={statusVariant[company.scrape_status] ?? "outline"}>
          {company.scrape_status}
        </Badge>
        {company.error_message && (
          <p className="text-xs text-destructive mt-1 max-w-xs truncate">{company.error_message}</p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {formatDate(company.last_scraped_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            title={company.active ? "Disable" : "Enable"}
            onClick={() => updateCompany({ id: company.id, data: { active: !company.active } })}
          >
            {company.active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Scrape now"
            disabled={isScraping || company.scrape_status === "running"}
            onClick={() => triggerScrape(company.id)}
          >
            <RefreshCw className={`h-4 w-4 ${isScraping ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Delete"
            onClick={() => {
              if (confirm(`Delete ${company.name}?`)) deleteCompany(company.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function Companies() {
  const { data: companies, isLoading } = useCompanies();
  const { mutate: triggerAll, isPending } = useTriggerScrape();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Companies</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => triggerAll("all")} disabled={isPending}>
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            Scrape All
          </Button>
          <AddCompanyDialog />
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      {!isLoading && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Company</th>
                <th className="px-4 py-3 text-left font-medium">Listing URL</th>
                <th className="px-4 py-3 text-left font-medium">Fetcher</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Last scraped</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
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
