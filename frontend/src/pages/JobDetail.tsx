import { useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Wifi, WifiOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useScrapeJob, useJobStream } from "@/hooks/useScrape";
import { Badge } from "@/components/ui/badge";
import { JobEvent } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ── Progress tracking ──────────────────────────────────────────────────────

function deriveProgress(events: JobEvent[]) {
  let totalUrls = 0;
  let processedUrls = 0;
  let currentCompany = "";
  let currentUrl = "";
  let currentExtractor = "";

  for (const e of events) {
    if (e.type === "company_started") {
      currentCompany = e.company_name;
      totalUrls += e.url_count;
    }
    if (e.type === "case_start") {
      currentUrl = e.url;
      currentExtractor = "";
    }
    if (e.type === "extract_start") currentExtractor = e.extractor;
    if (e.type === "extract_done") currentExtractor = "";
    if (e.type === "case_saved" || e.type === "case_skip" || e.type === "case_error") {
      processedUrls++;
      currentExtractor = "";
    }
    if (e.type === "company_done") {
      currentCompany = "";
      currentUrl = "";
    }
  }
  return { totalUrls, processedUrls, currentCompany, currentUrl, currentExtractor };
}

// ── Log row rendering ──────────────────────────────────────────────────────

function ts(raw: string) {
  return new Date(raw).toLocaleTimeString("en-GB", { hour12: false });
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || u.hostname;
  } catch {
    return url;
  }
}

function FieldBadges({ fields }: { fields: string[] }) {
  if (!fields.length) return <span className="text-zinc-600 text-xs">— nothing new</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {fields.map((f) => (
        <span key={f} className="bg-emerald-900/40 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded">
          {f}
        </span>
      ))}
    </span>
  );
}

function LogRow({ event }: { event: JobEvent }) {
  const time = <span className="text-zinc-600 w-20 shrink-0 font-mono text-xs">{ts(event.ts)}</span>;

  switch (event.type) {
    case "job_started":
      return (
        <div className="flex gap-3 items-center py-0.5">
          {time}
          <span className="text-blue-400 font-semibold">
            Job started — {event.company_count} {event.company_count === 1 ? "company" : "companies"}
          </span>
        </div>
      );

    case "llm_config":
      return (
        <div className="flex gap-3 items-center py-0.5">
          {time}
          <span className="text-purple-400">
            LLM: {event.model}
          </span>
        </div>
      );

    case "company_started":
      return (
        <div className="flex gap-3 items-center py-1 mt-1">
          {time}
          <span className="text-sky-300 font-bold">
            ▸ {event.company_name}
            <span className="text-zinc-500 font-normal ml-2 text-xs">{event.url_count} pages</span>
          </span>
        </div>
      );

    case "fetch_start":
      return (
        <div className="flex gap-3 items-center py-0.5 pl-4">
          {time}
          <span className="text-zinc-500 text-xs">
            fetching {event.url_count} pages ({event.fetcher_type})…
          </span>
        </div>
      );

    case "fetch_done":
      return (
        <div className="flex gap-3 items-center py-0.5 pl-4">
          {time}
          <span className="text-zinc-500 text-xs">
            fetched {event.fetched} pages in {(event.duration_ms / 1000).toFixed(1)}s
          </span>
        </div>
      );

    case "case_start":
      return (
        <div className="flex gap-3 items-baseline py-0.5 pl-4 mt-0.5">
          {time}
          <span className="text-zinc-300 text-xs">
            <span className="text-zinc-600">[{event.index}/{event.total}]</span>{" "}
            {shortUrl(event.url)}
          </span>
        </div>
      );

    case "extract_start":
      return (
        <div className="flex gap-3 items-center py-0 pl-10">
          {time}
          <span className="text-zinc-600 text-xs">⟳ {event.extractor}</span>
        </div>
      );

    case "extract_done":
      return (
        <div className="flex gap-3 items-center py-0 pl-10">
          {time}
          <span className="text-zinc-500 text-xs w-40 shrink-0">✓ {event.extractor}</span>
          <FieldBadges fields={event.fields_new} />
          <span className="text-zinc-700 text-xs ml-auto">{event.duration_ms}ms</span>
        </div>
      );

    case "case_saved":
      return (
        <div className="flex gap-3 items-center py-0.5 pl-10">
          {time}
          {event.is_new
            ? <span className="text-emerald-400 text-xs font-semibold">✓ new case saved</span>
            : <span className="text-zinc-500 text-xs">✓ updated</span>
          }
        </div>
      );

    case "case_skip":
      return (
        <div className="flex gap-3 items-center py-0 pl-10">
          {time}
          <span className="text-zinc-700 text-xs">= unchanged</span>
        </div>
      );

    case "case_error":
      return (
        <div className="flex gap-3 items-center py-0.5 pl-10">
          {time}
          <span className="text-red-400 text-xs">✗ {event.error}</span>
        </div>
      );

    case "company_done":
      return (
        <div className="flex gap-3 items-center py-0.5 pl-4">
          {time}
          <span className="text-sky-400 text-xs">
            {event.company_name} done — {event.cases_found} checked, {event.cases_new} new
          </span>
        </div>
      );

    case "company_error":
      return (
        <div className="flex gap-3 items-center py-0.5 pl-4">
          {time}
          <span className="text-red-400 text-xs">✗ {event.company_id}: {event.error}</span>
        </div>
      );

    case "job_done":
      return (
        <div className="flex gap-3 items-center py-1 mt-1 border-t border-zinc-800">
          {time}
          <span className="text-emerald-400 font-semibold">
            ✓ Job complete — {event.cases_found} checked, {event.cases_new} new
          </span>
        </div>
      );

    case "job_failed":
      return (
        <div className="flex gap-3 items-center py-1 mt-1 border-t border-zinc-800">
          {time}
          <span className="text-red-400 font-semibold">✗ Job failed: {event.error}</span>
        </div>
      );

    default:
      return null;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

const statusColors: Record<string, "success" | "warning" | "error" | "secondary"> = {
  done: "success",
  running: "warning",
  queued: "secondary",
  failed: "error",
};

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: job } = useScrapeJob(id ?? "");
  const { events, connected, streamDone } = useJobStream(id ?? "");
  const logRef = useRef<HTMLDivElement>(null);

  const { totalUrls, processedUrls, currentCompany, currentUrl, currentExtractor } =
    deriveProgress(events);

  const pct = totalUrls > 0 ? Math.round((processedUrls / totalUrls) * 100) : 0;
  const isRunning = job?.status === "running" || job?.status === "queued";

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events.length]);

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold">Job Log</h1>
        <span className="text-xs text-muted-foreground font-mono">{id}</span>
        {job && (
          <Badge variant={statusColors[job.status] ?? "secondary"}>
            {job.status}
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {isRunning && !streamDone
            ? connected
              ? <><Wifi className="h-3 w-3 text-emerald-500" /> live</>
              : <><Loader2 className="h-3 w-3 animate-spin" /> connecting…</>
            : streamDone
              ? <><CheckCircle className="h-3 w-3 text-emerald-500" /> complete</>
              : null
          }
          {job?.started_at && (
            <span>{formatDate(job.started_at)}</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalUrls > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{processedUrls} / {totalUrls} pages</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                streamDone && job?.status === "done" ? "bg-emerald-500" :
                job?.status === "failed" ? "bg-red-500" : "bg-blue-500"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Current activity */}
      {isRunning && !streamDone && (currentCompany || currentUrl) && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2 space-y-0.5">
          {currentCompany && (
            <div><span className="text-foreground font-medium">{currentCompany}</span></div>
          )}
          {currentUrl && (
            <div className="truncate font-mono">{currentUrl}</div>
          )}
          {currentExtractor && (
            <div className="text-purple-400">⟳ {currentExtractor}</div>
          )}
        </div>
      )}

      {/* Terminal log */}
      <div
        ref={logRef}
        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-y-auto font-mono text-xs min-h-0"
        style={{ minHeight: "400px" }}
      >
        {events.length === 0 && (
          <span className="text-zinc-600">
            {isRunning ? "Waiting for events…" : "No log available."}
          </span>
        )}
        {events.map((event, i) => (
          <LogRow key={i} event={event} />
        ))}
      </div>

      {/* Summary footer */}
      {job && (job.status === "done" || job.status === "failed") && (
        <div className="flex items-center gap-4 text-sm border-t pt-3">
          {job.status === "done"
            ? <CheckCircle className="h-4 w-4 text-emerald-500" />
            : <XCircle className="h-4 w-4 text-red-500" />
          }
          {job.status === "done"
            ? <span>{job.cases_found} pages checked · <strong>{job.cases_new} new cases</strong></span>
            : <span className="text-red-400">{job.error}</span>
          }
          {job.finished_at && (
            <span className="text-muted-foreground text-xs ml-auto">
              finished {formatDate(job.finished_at)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
