import { useState, useEffect } from "react";
import { useSettings, useUpdateSettings, useOllamaModels, useOllamaTest } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";

const SCRAPER_FIELDS = [
  "customer_name",
  "customer_industry",
  "customer_country",
  "challenge",
  "solution",
  "results",
  "products_used",
  "quote",
  "tags",
] as const;

// Fields for which extra heuristic section keywords make sense
const HEURISTIC_LABEL_FIELDS = new Set(["challenge", "solution", "results", "tags"]);

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b pb-2 mb-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{children}</h2>
    </div>
  );
}

export function Settings() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSettings, isPending: isSaving, error: saveError } = useUpdateSettings();
  const { data: modelsData, refetch: refetchModels, isFetching: isFetchingModels, error: modelsError } = useOllamaModels();
  const { mutate: testOllama, isPending: isTesting, data: testResult } = useOllamaTest();

  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [timeout, setTimeout_] = useState(60);

  // Scraper field config state: disabled fields + extra heuristic labels
  const [disabledFields, setDisabledFields] = useState<string[]>([]);
  const [heuristicLabels, setHeuristicLabels] = useState<Record<string, string>>({});
  const [scraperSaveError, setScraperSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setBaseUrl(settings.ollama_base_url);
      setModel(settings.ollama_model);
      setTimeout_(settings.ollama_timeout);
      setDisabledFields(settings.scraper_enabled_fields ?? []);
      const labelsAsText: Record<string, string> = {};
      for (const [field, labels] of Object.entries(settings.scraper_heuristic_labels ?? {})) {
        labelsAsText[field] = labels.join(", ");
      }
      setHeuristicLabels(labelsAsText);
    }
  }, [settings]);

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const ollamaEnabled = settings?.ollama_enabled ?? false;
  const availableModels = modelsData?.models ?? [];

  const handleSaveOllama = () => {
    updateSettings({ ollama_base_url: baseUrl, ollama_model: model, ollama_timeout: timeout });
  };

  const handleSaveScraperConfig = () => {
    setScraperSaveError(null);
    const labels: Record<string, string[]> = {};
    for (const [field, raw] of Object.entries(heuristicLabels)) {
      const arr = raw.split(",").map((s) => s.trim()).filter(Boolean);
      if (arr.length > 0) labels[field] = arr;
    }
    updateSettings(
      { scraper_enabled_fields: disabledFields, scraper_heuristic_labels: labels },
      { onError: (e) => setScraperSaveError(e instanceof Error ? e.message : "Save failed") }
    );
  };

  const toggleField = (field: string, enabled: boolean) => {
    setDisabledFields((prev) =>
      enabled ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  return (
    <div className="p-6 max-w-xl space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Ollama / LLM */}
      <section>
        <SectionHeader>Local LLM (Ollama)</SectionHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Ollama extraction</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Runs after heuristic extraction to fill in missing fields.
              </p>
            </div>
            <Switch
              checked={ollamaEnabled}
              onChange={(v) => updateSettings({ ollama_enabled: v })}
            />
          </div>

          <div className={`space-y-4 ${!ollamaEnabled ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="space-y-1">
              <Label>Ollama base URL</Label>
              <div className="flex gap-2">
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                />
                <Button
                  variant="outline"
                  size="icon"
                  title="Check connection"
                  onClick={() => { refetchModels(); }}
                  disabled={isFetchingModels}
                >
                  {isFetchingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              {(modelsData || modelsError) && (
                <div className="flex items-center gap-1.5 text-xs mt-1">
                  {modelsData?.reachable
                    ? <><CheckCircle className="h-3.5 w-3.5 text-green-600" /><span className="text-green-700">Ollama reachable · {availableModels.length} model(s) found</span></>
                    : <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-destructive">{modelsData?.error ?? (modelsError instanceof Error ? modelsError.message : "Cannot reach Ollama")}</span></>
                  }
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Model</Label>
              {availableModels.length > 0 ? (
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="llama3.2"
                />
              )}
              <p className="text-xs text-muted-foreground">
                Must support JSON mode. Recommended: <code>llama3.2</code>, <code>mistral</code>, <code>qwen2.5</code>
              </p>
            </div>

            <div className="space-y-1">
              <Label>Timeout per page (seconds)</Label>
              <Input
                type="number"
                min={10}
                max={300}
                value={timeout}
                onChange={(e) => setTimeout_(Number(e.target.value))}
                className="w-28"
              />
              <p className="text-xs text-muted-foreground">LLM call timeout per case page. Increase for slower hardware.</p>
            </div>

            {saveError && (
              <p className="text-sm text-destructive">{saveError instanceof Error ? saveError.message : "Save failed"}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={handleSaveOllama} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => testOllama()}
                disabled={isTesting}
              >
                {isTesting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Testing…</> : "Test connection"}
              </Button>
            </div>

            {testResult && (
              <div className="border rounded-md p-3 text-sm space-y-1 bg-muted/30">
                <div className="flex items-center gap-2">
                  {testResult.reachable
                    ? <CheckCircle className="h-4 w-4 text-green-600" />
                    : <XCircle className="h-4 w-4 text-destructive" />}
                  <span>{testResult.reachable ? "Ollama is reachable" : "Cannot reach Ollama"}</span>
                </div>
                {testResult.reachable && (
                  <div className="flex items-center gap-2">
                    {testResult.model_available
                      ? <CheckCircle className="h-4 w-4 text-green-600" />
                      : <XCircle className="h-4 w-4 text-destructive" />}
                    <span>
                      Model <code className="text-xs bg-muted px-1 rounded">{model}</code>{" "}
                      {testResult.model_available ? "is available" : "not found — run: ollama pull " + model}
                    </span>
                  </div>
                )}
                {testResult.available_models && testResult.available_models.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {testResult.available_models.map((m) => (
                      <Badge key={m} variant="secondary" className="text-xs font-mono">{m}</Badge>
                    ))}
                  </div>
                )}
                {testResult.error && (
                  <p className="text-destructive text-xs">{testResult.error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Scraper Fields */}
      <section>
        <SectionHeader>Scraper Fields</SectionHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Disable fields to prevent the scraper from extracting them. Add extra section-header
          keywords to improve heuristic extraction for specific fields.
        </p>
        <div className="space-y-4">
          {SCRAPER_FIELDS.map((field) => {
            const isEnabled = !disabledFields.includes(field);
            return (
              <div key={field} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium font-mono">{field}</span>
                  <Switch checked={isEnabled} onChange={(v) => toggleField(field, v)} />
                </div>
                {isEnabled && HEURISTIC_LABEL_FIELDS.has(field) && (
                  <div className="space-y-1 pl-1">
                    <Label className="text-xs text-muted-foreground">
                      Extra section keywords (comma-separated)
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder={`e.g. ${field === "challenge" ? "pain point, problem" : field === "results" ? "roi, savings" : "extra keyword"}`}
                      value={heuristicLabels[field] ?? ""}
                      onChange={(e) =>
                        setHeuristicLabels((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
          {scraperSaveError && (
            <p className="text-sm text-destructive">{scraperSaveError}</p>
          )}
          <Button size="sm" onClick={handleSaveScraperConfig} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </section>

      {/* Scheduler */}
      <section>
        <SectionHeader>Scheduler</SectionHeader>
        <p className="text-sm text-muted-foreground">
          Weekly scrape runs every <strong className="text-foreground">Friday at 18:00 UTC</strong> automatically.
        </p>
      </section>

      {/* About */}
      <section>
        <SectionHeader>About</SectionHeader>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Scrappy v0.1.0 — Local reference case tracker</p>
          <p>Database: <code className="text-xs bg-muted px-1 rounded">data/scrappy.db</code></p>
          <p>
            Extraction pipeline: OG tags → JSON-LD → Heuristics
            {ollamaEnabled
              ? <> → <Badge variant="default" className="text-xs ml-1">LLM ({model})</Badge></>
              : " → LLM (disabled)"}
          </p>
        </div>
      </section>
    </div>
  );
}
