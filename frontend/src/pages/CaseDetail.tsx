import { useParams, Link, useNavigate } from "react-router-dom";
import { useCase, useUpdateCase, useDeleteCase } from "@/hooks/useCases";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate, parseTags, computeQualityScore } from "@/lib/utils";
import type { ReferenceCase } from "@/lib/api";
import { ArrowLeft, ExternalLink, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
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

function QualityBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-100 text-green-700 border-green-200"
      : score >= 40
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-red-100 text-red-700 border-red-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums ${color}`}
      title="Data quality score"
    >
      {score}%
    </span>
  );
}

const TEXTAREA_CLS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y min-h-[80px]";

function EditDialog({ c }: { c: ReferenceCase }) {
  const [open, setOpen] = useState(false);
  const { mutate: updateCase, isPending, error } = useUpdateCase();

  const [form, setForm] = useState({
    title: c.title ?? "",
    customer_name: c.customer_name ?? "",
    customer_industry: c.customer_industry ?? "",
    customer_country: c.customer_country ?? "",
    challenge: c.challenge ?? "",
    solution: c.solution ?? "",
    results: c.results ?? "",
    quote: c.quote ?? "",
    quote_author: c.quote_author ?? "",
    quote_author_company: c.quote_author_company ?? "",
    products_used: c.products_used ?? "",
    tags: c.tags
      ? (() => { try { return JSON.parse(c.tags).join(", "); } catch { return c.tags; } })()
      : "",
    publish_date: c.publish_date ?? "",
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    const data: Record<string, string | null> = {};
    for (const [key, val] of Object.entries(form)) {
      if (key === "tags" && val) {
        // Normalise comma-separated tags back to JSON array
        const arr = val.split(",").map((t: string) => t.trim()).filter(Boolean);
        data.tags = JSON.stringify(arr);
      } else {
        data[key] = val || null;
      }
    }
    updateCase(
      { id: c.id, data },
      { onSuccess: () => setOpen(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Case</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Customer name</Label>
              <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Industry</Label>
              <Input value={form.customer_industry} onChange={(e) => set("customer_industry", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input value={form.customer_country} onChange={(e) => set("customer_country", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Publish date</Label>
              <Input
                type="date"
                value={form.publish_date}
                onChange={(e) => set("publish_date", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Challenge</Label>
            <textarea
              className={TEXTAREA_CLS}
              value={form.challenge}
              onChange={(e) => set("challenge", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Solution</Label>
            <textarea
              className={TEXTAREA_CLS}
              value={form.solution}
              onChange={(e) => set("solution", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Results</Label>
            <textarea
              className={TEXTAREA_CLS}
              value={form.results}
              onChange={(e) => set("results", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Quote</Label>
            <textarea
              className={TEXTAREA_CLS}
              value={form.quote}
              onChange={(e) => set("quote", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Quote author</Label>
              <Input value={form.quote_author} onChange={(e) => set("quote_author", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Author company</Label>
              <Input value={form.quote_author_company} onChange={(e) => set("quote_author_company", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Products used <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
            <Input value={form.products_used} onChange={(e) => set("products_used", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
            <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </div>
          {error && (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Save failed"}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: c, isLoading } = useCase(id ?? "");
  const [showRaw, setShowRaw] = useState(false);
  const navigate = useNavigate();
  const { mutate: deleteCase } = useDeleteCase();

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!c) return <div className="p-6 text-muted-foreground">Case not found.</div>;

  const tags = parseTags(c.tags);
  const products = c.products_used
    ? c.products_used.split(",").map((p) => p.trim()).filter(Boolean)
    : [];
  const score = computeQualityScore(c);

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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold leading-tight">{c.title || "Untitled Case"}</h1>
                <QualityBadge score={score} />
              </div>
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
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <EditDialog c={c} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Delete case"
                    onClick={() => {
                      if (confirm("Permanently delete this case?")) {
                        deleteCase(c.id, { onSuccess: () => navigate("/cases") });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View source <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
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
