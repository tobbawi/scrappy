import { useParams, Link } from "react-router-dom";
import { useCase } from "@/hooks/useCases";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, parseTags } from "@/lib/utils";
import { ArrowLeft, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ContentSectionProps {
  label: string;
  value: string | null | undefined;
  borderColor: string;
}

function ContentSection({ label, value, borderColor }: ContentSectionProps) {
  if (!value) return null;
  return (
    <div className={`border-l-4 ${borderColor} pl-4 py-1`}>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
      </div>
      <p className="text-sm leading-relaxed">{value}</p>
    </div>
  );
}

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: c, isLoading } = useCase(id!);
  const [showRaw, setShowRaw] = useState(false);

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!c) return <div className="p-6 text-muted-foreground">Case not found.</div>;

  const tags = parseTags(c.tags);
  const products = c.products_used
    ? c.products_used.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/cases">
          <Button variant="ghost" size="icon" className="shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            {c.customer_logo_url && (
              <img
                src={c.customer_logo_url}
                alt={c.customer_name ?? "logo"}
                className="h-16 w-16 object-contain rounded-lg border bg-white p-1 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight">{c.title || "Untitled Case"}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="secondary">{c.company_id}</Badge>
                {c.customer_industry && (
                  <Badge variant="outline">{c.customer_industry}</Badge>
                )}
                {c.customer_country && (
                  <Badge variant="outline">{c.customer_country}</Badge>
                )}
                {c.publish_date && (
                  <span className="text-sm text-muted-foreground">
                    Published {formatDate(c.publish_date)}
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  · Found {formatDate(c.first_seen)}
                </span>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline ml-auto"
                >
                  View source <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer info row */}
      {(c.customer_name) && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {c.customer_name && (
            <span>
              <span className="text-xs font-semibold uppercase tracking-wide mr-1.5">Customer</span>
              {c.customer_name}
            </span>
          )}
        </div>
      )}

      {/* Quote */}
      {c.quote && (
        <div className="relative rounded-lg bg-indigo-50/50 border border-indigo-100 px-6 py-5">
          <span className="absolute top-2 left-4 text-6xl leading-none text-indigo-200 font-serif select-none">
            "
          </span>
          <blockquote className="relative text-lg leading-relaxed mt-3 text-foreground">
            {c.quote}
          </blockquote>
          {(c.quote_author || c.quote_author_company) && (
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              — {[c.quote_author, c.quote_author_company].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Two-column: Challenge + Solution */}
      {(c.challenge || c.solution) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ContentSection
            label="Challenge"
            value={c.challenge}
            borderColor="border-l-amber-400"
          />
          <ContentSection
            label="Solution"
            value={c.solution}
            borderColor="border-l-blue-400"
          />
        </div>
      )}

      {/* Results — full width */}
      <ContentSection
        label="Results"
        value={c.results}
        borderColor="border-l-emerald-400"
      />

      {/* Products used */}
      {products.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Products Used
          </div>
          <div className="flex flex-wrap gap-1.5">
            {products.map((p) => (
              <span
                key={p}
                className="inline-block bg-zinc-100 text-zinc-700 rounded-full text-xs px-2.5 py-1 font-medium"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Tags
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <Badge key={t} variant="outline" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Raw text accordion */}
      {c.raw_text && (
        <div className="border rounded-lg">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50"
            onClick={() => setShowRaw(!showRaw)}
          >
            Raw extracted text
            {showRaw ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showRaw && (
            <pre className="px-4 pb-4 text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
              {c.raw_text}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
