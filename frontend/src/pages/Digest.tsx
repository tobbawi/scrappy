import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { Download } from "lucide-react";

export function Digest() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const [since, setSince] = useState(weekAgo.toISOString().slice(0, 10));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["digest", since],
    queryFn: () => api.digest.get({ since }),
  });

  const downloadFormat = async (format: "html" | "markdown") => {
    const res = await fetch(`/api/digest?since=${since}&format=${format}`);
    const text = await res.text();
    const blob = new Blob([text], { type: format === "html" ? "text/html" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scrappy-digest-${since}.${format === "html" ? "html" : "md"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Weekly Digest</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadFormat("markdown")}>
            <Download className="h-4 w-4" />
            Markdown
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadFormat("html")}>
            <Download className="h-4 w-4" />
            HTML
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label>Since date</Label>
          <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="w-44" />
        </div>
        <Button onClick={() => refetch()} size="sm">Refresh</Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading digest…</p>}

      {data && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            <strong>{data.total_new}</strong> new cases since {formatDate(data.since)}
          </p>

          {Object.entries(data.by_company).map(([companyId, cases]) => (
            <div key={companyId} className="border rounded-lg">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="font-semibold">{companyId} <span className="text-muted-foreground font-normal text-sm">({cases.length} new)</span></h2>
              </div>
              <div className="divide-y">
                {cases.map((c) => (
                  <div key={c.id} className="px-4 py-3">
                    <p className="font-medium text-sm">{c.title || c.url}</p>
                    {c.customer_name && <p className="text-xs text-muted-foreground">{c.customer_name}</p>}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{formatDate(c.first_seen)}</span>
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View →</a>
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
