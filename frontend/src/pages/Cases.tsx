import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useCases } from "@/hooks/useCases";
import { useCompanies } from "@/hooks/useCompanies";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, truncate, parseTags, isNewThisWeek, computeQualityScore } from "@/lib/utils";
import { Search, ExternalLink } from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function CompanyAvatar({ companyId }: { companyId: string }) {
  const initial = companyId.charAt(0).toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 select-none">
      {initial}
    </div>
  );
}

function PagePills({
  current,
  total,
  onPage,
}: {
  current: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages: (number | "...")[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("...");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push("...");
    pages.push(total);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={current <= 1}
        onClick={() => onPage(current - 1)}
        className="h-8 px-3 text-xs"
      >
        ←
      </Button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-xs">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === current ? "default" : "outline"}
            size="sm"
            onClick={() => onPage(p as number)}
            className="h-8 w-8 p-0 text-xs"
          >
            {p}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={current >= total}
        onClick={() => onPage(current + 1)}
        className="h-8 px-3 text-xs"
      >
        →
      </Button>
    </div>
  );
}

export function Cases() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debouncedQ = useDebounce(q, 300);

  const company = searchParams.get("company") ?? "";
  const industry = searchParams.get("industry") ?? "";
  const country = searchParams.get("country") ?? "";
  const sort = (searchParams.get("sort") ?? "first_seen") as "first_seen" | "publish_date";
  const page = parseInt(searchParams.get("page") ?? "1");
  const newOnly = searchParams.get("new_only") === "true";

  const { data: companiesData } = useCompanies();
  const companies = companiesData?.items;
  const { data, isLoading } = useCases({
    q: debouncedQ,
    company: company || undefined,
    industry: industry || undefined,
    country: country || undefined,
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

  const hasFilters = !!(company || industry || country || newOnly || q);

  // Collect unique industries and countries from loaded data for filter options
  const allIndustries = Array.from(
    new Set(data?.items.map((c) => c.customer_industry).filter(Boolean) as string[])
  ).sort();
  const allCountries = Array.from(
    new Set(data?.items.map((c) => c.customer_country).filter(Boolean) as string[])
  ).sort();

  return (
    <div className="flex flex-col h-full">
      {/* Top filter bar */}
      <div className="border-b bg-card px-6 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Search title, customer, text…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <Select value={company || "all"} onValueChange={(v) => setParam("company", v === "all" ? "" : v)}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={industry || "all"} onValueChange={(v) => setParam("industry", v === "all" ? "" : v)}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {allIndustries.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={country || "all"} onValueChange={(v) => setParam("country", v === "all" ? "" : v)}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {allCountries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setParam("sort", v)}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first_seen">Date found</SelectItem>
              <SelectItem value="publish_date">Publish date</SelectItem>
            </SelectContent>
          </Select>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newOnly}
              onChange={(e) => setParam("new_only", e.target.checked ? "true" : "")}
              className="accent-indigo-600 h-4 w-4"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">New only</span>
          </label>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground"
              onClick={() => {
                setQ("");
                setSearchParams({});
              }}
            >
              Clear
            </Button>
          )}

          <span className="ml-auto text-sm text-muted-foreground whitespace-nowrap">
            {data?.total ?? 0} results
          </span>
        </div>
      </div>

      {/* Case list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

        {data?.items.map((c) => {
          const tags = parseTags(c.tags);
          const isNew = isNewThisWeek(c.first_seen);
          const score = computeQualityScore(c);
          const scoreColor =
            score >= 70 ? "bg-green-100 text-green-600"
            : score >= 40 ? "bg-yellow-100 text-yellow-600"
            : "bg-red-100 text-red-600";
          return (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="group block bg-card border rounded-lg px-4 py-3 hover:shadow-card hover:-translate-y-px transition-all duration-150"
            >
              <div className="flex items-start gap-3">
                <CompanyAvatar companyId={c.company_id} />
                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">{c.company_id}</span>
                    {c.customer_industry && (
                      <span className="text-xs text-muted-foreground">{c.customer_industry}</span>
                    )}
                    {c.customer_country && (
                      <span className="text-xs text-muted-foreground">{c.customer_country}</span>
                    )}
                    {isNew && <Badge variant="new">NEW</Badge>}
                    <span className={`ml-auto text-xs font-medium px-1.5 py-px rounded-full tabular-nums shrink-0 ${scoreColor}`}>
                      {score}%
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(c.first_seen)}
                    </span>
                  </div>

                  {/* Title + customer */}
                  <h3 className="font-medium text-sm mt-0.5 truncate">{c.title || c.url}</h3>
                  {c.customer_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">{c.customer_name}</p>
                  )}

                  {/* Quote */}
                  {c.quote && (
                    <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">
                      "{truncate(c.quote, 140)}"
                    </p>
                  )}

                  {/* Tags + source */}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="flex gap-1 flex-wrap">
                      {tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="inline-block bg-zinc-100 text-zinc-600 rounded text-xs px-1.5 py-px"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                    >
                      Source <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {data?.items.length === 0 && !isLoading && (
          <p className="text-center text-muted-foreground py-12">No cases found.</p>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex justify-center pt-4">
            <PagePills
              current={page}
              total={data.pages}
              onPage={(p) => setParam("page", String(p))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
