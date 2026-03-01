import { useParams, Link } from "react-router-dom";
import { useCase } from "@/hooks/useCases";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, parseTags } from "@/lib/utils";
import { ArrowLeft, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <p className="text-sm">{value}</p>
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

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/cases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex-1 min-w-0 truncate">{c.title || "Untitled Case"}</h1>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{c.company_id}</Badge>
        {c.customer_industry && <Badge variant="secondary">{c.customer_industry}</Badge>}
        {c.customer_country && <Badge variant="outline">{c.customer_country}</Badge>}
        {c.publish_date && <span className="text-sm text-muted-foreground">Published {formatDate(c.publish_date)}</span>}
        <span className="text-sm text-muted-foreground">· Found {formatDate(c.first_seen)}</span>
        <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline ml-auto">
          View source <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Customer */}
      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Customer</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" value={c.customer_name} />
          <Field label="Industry" value={c.customer_industry} />
          <Field label="Country" value={c.customer_country} />
        </div>
        {c.customer_logo_url && (
          <img src={c.customer_logo_url} alt={c.customer_name ?? "logo"} className="h-12 object-contain" />
        )}
      </div>

      {/* Quote */}
      {c.quote && (
        <div className="border-l-4 border-primary pl-4 py-2">
          <blockquote className="text-sm italic text-muted-foreground">"{c.quote}"</blockquote>
          {(c.quote_author || c.quote_author_company) && (
            <p className="text-xs mt-1 font-medium">
              — {[c.quote_author, c.quote_author_company].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Case content */}
      <div className="space-y-4">
        <Field label="Challenge" value={c.challenge} />
        <Field label="Solution" value={c.solution} />
        <Field label="Results" value={c.results} />
        <Field label="Products used" value={c.products_used} />
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Tags</div>
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
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
