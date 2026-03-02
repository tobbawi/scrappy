// Typed API client

export interface Company {
  id: string;
  name: string;
  listing_url: string;
  fetcher_type: "static" | "dynamic" | "stealthy";
  case_path_prefix: string | null;
  active: boolean;
  created_at: string;
  last_scraped_at: string | null;
  scrape_status: "idle" | "running" | "error" | "success";
  error_message: string | null;
}

export interface ReferenceCase {
  id: string;
  company_id: string;
  url: string;
  title: string | null;
  customer_name: string | null;
  customer_industry: string | null;
  customer_country: string | null;
  customer_logo_url: string | null;
  challenge: string | null;
  solution: string | null;
  results: string | null;
  products_used: string | null;
  quote: string | null;
  quote_author: string | null;
  quote_author_company: string | null;
  publish_date: string | null;
  tags: string | null;
  first_seen: string;
  last_checked: string;
  content_hash: string;
  raw_text: string | null;
}

export interface CaseUpdate {
  title?: string | null;
  customer_name?: string | null;
  customer_industry?: string | null;
  customer_country?: string | null;
  customer_logo_url?: string | null;
  challenge?: string | null;
  solution?: string | null;
  results?: string | null;
  products_used?: string | null;
  quote?: string | null;
  quote_author?: string | null;
  quote_author_company?: string | null;
  publish_date?: string | null;
  tags?: string | null;
}

export interface PaginatedCases {
  items: ReferenceCase[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface PaginatedCompanies {
  items: Company[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ScrapeJob {
  id: string;
  company_id: string | null;
  status: "queued" | "running" | "done" | "failed";
  started_at: string | null;
  finished_at: string | null;
  cases_found: number;
  cases_new: number;
  error: string | null;
  log: string | null;
}

// SSE event types emitted by /api/scrape/jobs/:id/stream
export type JobEvent =
  | { type: "job_started";     ts: string; company_count: number }
  | { type: "llm_config";      ts: string; model: string; base_url: string }
  | { type: "company_started"; ts: string; company_id: string; company_name: string; url_count: number }
  | { type: "fetch_start";     ts: string; company_id: string; url_count: number; fetcher_type: string }
  | { type: "fetch_done";      ts: string; company_id: string; fetched: number; duration_ms: number }
  | { type: "case_start";      ts: string; url: string; index: number; total: number }
  | { type: "extract_start";   ts: string; url: string; extractor: string }
  | { type: "extract_done";    ts: string; url: string; extractor: string; fields_new: string[]; duration_ms: number }
  | { type: "case_saved";      ts: string; url: string; case_id: string; is_new: boolean }
  | { type: "case_skip";       ts: string; url: string; reason: string }
  | { type: "case_error";      ts: string; url: string; error: string }
  | { type: "company_done";    ts: string; company_id: string; company_name: string; cases_found: number; cases_new: number }
  | { type: "company_error";   ts: string; company_id: string; error: string }
  | { type: "job_done";        ts: string; cases_found: number; cases_new: number }
  | { type: "job_failed";      ts: string; error: string };

export interface Stats {
  total_companies: number;
  active_companies: number;
  total_cases: number;
  new_cases_this_week: number;
  last_scrape: string | null;
  companies_by_status: Record<string, number>;
}

export interface AppSettings {
  ollama_enabled: boolean;
  ollama_base_url: string;
  ollama_model: string;
  ollama_timeout: number;
  scraper_enabled_fields: string[];
  scraper_heuristic_labels: Record<string, string[]>;
}

export interface OllamaStatus {
  reachable: boolean;
  model_available: boolean;
  available_models?: string[];
  error?: string;
}

export interface DigestResponse {
  since: string;
  total_new: number;
  by_company: Record<string, Array<{
    id: string;
    title: string | null;
    customer_name: string | null;
    url: string;
    first_seen: string;
  }>>;
}

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Companies
export const api = {
  companies: {
    list: (page = 1, per_page = 100) =>
      request<PaginatedCompanies>(`/companies?page=${page}&per_page=${per_page}`),
    create: (data: { name: string; listing_url: string; fetcher_type?: string; case_path_prefix?: string | null; active?: boolean }) =>
      request<Company>("/companies", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Company>) =>
      request<Company>(`/companies/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/companies/${id}`, { method: "DELETE" }),
  },

  cases: {
    list: (params: Record<string, string | number | boolean | undefined>) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      }
      return request<PaginatedCases>(`/cases?${qs}`);
    },
    get: (id: string) => request<ReferenceCase>(`/cases/${id}`),
    update: (id: string, data: CaseUpdate) =>
      request<ReferenceCase>(`/cases/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/cases/${id}`, { method: "DELETE" }),
  },

  scrape: {
    trigger: (company_id: string = "all") =>
      request<ScrapeJob>("/scrape", { method: "POST", body: JSON.stringify({ company_id }) }),
    jobs: () => request<ScrapeJob[]>("/scrape/jobs"),
    job: (id: string) => request<ScrapeJob>(`/scrape/jobs/${id}`),
  },

  digest: {
    get: (params?: { since?: string; format?: "json" | "html" | "markdown" }) => {
      const qs = new URLSearchParams(params as Record<string, string>);
      return request<DigestResponse>(`/digest?${qs}`);
    },
  },

  stats: {
    get: () => request<Stats>("/stats"),
  },

  export: {
    pptx: (params: Record<string, string | undefined>) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
      return fetch(`${BASE}/export/pptx?${qs}`);
    },
  },

  settings: {
    get: () => request<AppSettings>("/settings"),
    update: (data: Partial<AppSettings>) =>
      request<AppSettings>("/settings", { method: "PATCH", body: JSON.stringify(data) }),
    ollamaModels: () => request<{ models: string[]; reachable: boolean; error?: string }>("/settings/ollama/models"),
    ollamaTest: () => request<OllamaStatus>("/settings/ollama/test", { method: "POST" }),
  },
};
