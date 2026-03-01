import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Download } from "lucide-react";

const PERIODS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
];

function sinceDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function Digest() {
  const [activeDays, setActiveDays] = useState(7);
  const since = sinceDate(activeDays);

  const { data, isLoading } = useQuery({
    queryKey: ["digest", since],
    queryFn: () => api.digest.get({ since }),
  });

  const downloadFormat = async (format: "html" | "markdown") => {
    try {
      const res = await fetch(`/api/digest?since=${since}&format=${format}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const text = await res.text();
      const blob = new Blob([text], { type: format === "html" ? "text/html" : "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scrappy-digest-${since}.${format === "html" ? "html" : "md"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Download failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Weekly Digest</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadFormat("markdown")} className="gap-1.5">
            <Download className="h-4 w-4" />
            Markdown
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadFormat("html")} className="gap-1.5">
            <Download className="h-4 w-4" />
            HTML
          </Button>
        </div>
      </div>

      {/* Segmented time control */}
      <div className="inline-flex rounded-lg border bg-muted/30 p-1 gap-1">
        {PERIODS.map(({ label, days }) => (
          <button
            key={days}
            onClick={() => setActiveDays(days)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeDays === days
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-muted-foreground">Loading digest…</p>}

      {data && (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{data.total_new}</strong> new case{data.total_new !== 1 ? "s" : ""} since {formatDate(data.since)}
          </p>

          {Object.entries(data.by_company).map(([companyId, cases]) => (
            <div key={companyId} className="border rounded-lg bg-card shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between">
                <h2 className="font-semibold">{companyId}</h2>
                <span className="text-sm text-muted-foreground">{cases.length} new</span>
              </div>
              <div className="divide-y">
                {cases.map((c) => (
                  <div key={c.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 select-none mt-0.5">
                      {companyId.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{c.title || c.url}</p>
                      {c.customer_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{c.customer_name}</p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">{formatDate(c.first_seen)}</span>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {data.total_new === 0 && (
            <p className="text-center text-muted-foreground py-8">No new cases in this period.</p>
          )}
        </div>
      )}
    </div>
  );
}
