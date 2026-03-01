import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useCases } from "@/hooks/useCases";
import { useCompanies } from "@/hooks/useCompanies";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, truncate, parseTags } from "@/lib/utils";
import { Search, ExternalLink } from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function Cases() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debouncedQ = useDebounce(q, 300);

  const company = searchParams.get("company") ?? "";
  const industry = searchParams.get("industry") ?? "";
  const sort = (searchParams.get("sort") ?? "first_seen") as "first_seen" | "publish_date";
  const page = parseInt(searchParams.get("page") ?? "1");
  const newOnly = searchParams.get("new_only") === "true";

  const { data: companies } = useCompanies();
  const { data, isLoading } = useCases({
    q: debouncedQ,
    company: company || undefined,
    industry: industry || undefined,
    sort,
    page,
    per_page: 20,
    new_only: newOnly || undefined,
  });

  const setParam = (key: string, val: string) => {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      if (val) next.set(key, val);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  };

  return (
    <div className="flex h-full">
      {/* Filters sidebar */}
      <aside className="w-48 shrink-0 border-r p-4 space-y-4">
        <h2 className="font-semibold text-sm">Filters</h2>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Company</label>
          <Select value={company} onValueChange={(v) => setParam("company", v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Sort by</label>
          <Select value={sort} onValueChange={(v) => setParam("sort", v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first_seen">Date found</SelectItem>
              <SelectItem value="publish_date">Publish date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="new_only"
            checked={newOnly}
            onChange={(e) => setParam("new_only", e.target.checked ? "true" : "")}
          />
          <label htmlFor="new_only" className="text-xs">New this week</label>
        </div>

        {(company || industry || newOnly || q) && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => { setQ(""); setSearchParams({}); }}
          >
            Clear filters
          </Button>
        )}
      </aside>

      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cases</h1>
          <span className="text-sm text-muted-foreground">{data?.total ?? 0} results</span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search title, customer, text…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {isLoading && <p className="text-muted-foreground">Loading…</p>}

        <div className="space-y-2">
          {data?.items.map((c) => {
            const tags = parseTags(c.tags);
            return (
              <Link
                key={c.id}
                to={`/cases/${c.id}`}
                className="block border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{c.title || c.url}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {c.customer_name && <span className="text-sm text-muted-foreground">{c.customer_name}</span>}
                      {c.customer_industry && <Badge variant="secondary" className="text-xs">{c.customer_industry}</Badge>}
                      {c.customer_country && <Badge variant="outline" className="text-xs">{c.customer_country}</Badge>}
                    </div>
                    {c.quote && (
                      <p className="text-sm text-muted-foreground mt-2 italic">"{truncate(c.quote, 120)}"</p>
                    )}
                    {tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {tags.slice(0, 4).map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className="text-xs text-muted-foreground">{formatDate(c.first_seen)}</div>
                    <div className="text-xs text-muted-foreground">{c.company_id}</div>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Source <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </Link>
            );
          })}

          {data?.items.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground py-12">No cases found.</p>
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {data.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pages}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
