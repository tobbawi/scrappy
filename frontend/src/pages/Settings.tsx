import { useState, useEffect } from "react";
import { useSettings, useUpdateSettings, useLlmModels, useLlmTest } from "@/hooks/useSettings";
import { LlmProvider } from "@/lib/api";
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

  const [provider, setProvider] = useState<LlmProvider>("none");

  // Ollama fields
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("");
  const [ollamaTimeout, setOllamaTimeout] = useState(60);

  // OpenAI-compatible fields
  const [openaiUrl, setOpenaiUrl] = useState("http://localhost:8080");
  const [openaiModel, setOpenaiModel] = useState("");
  const [openaiTimeout, setOpenaiTimeout] = useState(60);

  // LLM models & test — use the active provider
  const { data: modelsData, refetch: refetchModels, isFetching: isFetchingModels, error: modelsError } = useLlmModels(provider);
  const { mutate: testLlm, isPending: isTesting, data: testResult, reset: resetTest } = useLlmTest();

  // Scraper field config state
  const [disabledFields, setDisabledFields] = useState<string[]>([]);
  const [heuristicLabels, setHeuristicLabels] = useState<Record<string, string>>({});
  const [scraperSaveError, setScraperSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setProvider(settings.llm_provider);
      setOllamaUrl(settings.ollama_base_url);
      setOllamaModel(settings.ollama_model);
      setOllamaTimeout(settings.ollama_timeout);
      setOpenaiUrl(settings.openai_base_url);
      setOpenaiModel(settings.openai_model);
      setOpenaiTimeout(settings.openai_timeout);
      setDisabledFields(settings.scraper_enabled_fields ?? []);
      const labelsAsText: Record<string, string> = {};
      for (const [field, labels] of Object.entries(settings.scraper_heuristic_labels ?? {})) {
        labelsAsText[field] = labels.join(", ");
      }
      setHeuristicLabels(labelsAsText);
    }
  }, [settings]);

  // Reset test result when switching providers
  useEffect(() => {
    resetTest();
  }, [provider, resetTest]);

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const availableModels = modelsData?.models ?? [];

  const handleProviderChange = (v: string) => {
    const newProvider = v as LlmProvider;
    setProvider(newProvider);
    updateSettings({ llm_provider: newProvider });
  };

  const handleSaveLlm = () => {
    if (provider === "ollama") {
      updateSettings({ ollama_base_url: ollamaUrl, ollama_model: ollamaModel, ollama_timeout: ollamaTimeout });
    } else if (provider === "openai") {
      updateSettings({ openai_base_url: openaiUrl, openai_model: openaiModel, openai_timeout: openaiTimeout });
    }
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

  const currentBaseUrl = provider === "openai" ? openaiUrl : ollamaUrl;
  const currentModel = provider === "openai" ? openaiModel : ollamaModel;

  return (
    <div className="p-6 max-w-xl space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* LLM Provider */}
      <section>
        <SectionHeader>LLM Extraction</SectionHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (disabled)</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
                <SelectItem value="openai">OpenAI-compatible</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Runs after heuristic extraction to fill in missing fields.
            </p>
          </div>

          {provider !== "none" && (
            <div className="space-y-4">
              {/* Base URL */}
              <div className="space-y-1">
                <Label>{provider === "ollama" ? "Ollama base URL" : "Server base URL"}</Label>
                <div className="flex gap-2">
                  <Input
                    value={provider === "ollama" ? ollamaUrl : openaiUrl}
                    onChange={(e) => provider === "ollama" ? setOllamaUrl(e.target.value) : setOpenaiUrl(e.target.value)}
                    placeholder={provider === "ollama" ? "http://localhost:11434" : "http://localhost:8080"}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    title="Refresh models"
                    onClick={() => refetchModels()}
                    disabled={isFetchingModels}
                  >
                    {isFetchingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
                {provider === "openai" && (
                  <p className="text-xs text-muted-foreground">
                    Works with llama.cpp, vLLM, LocalAI, LM Studio, etc.
                  </p>
                )}
                {(modelsData || modelsError) && (
                  <div className="flex items-center gap-1.5 text-xs mt-1">
                    {modelsData?.reachable
                      ? <><CheckCircle className="h-3.5 w-3.5 text-green-600" /><span className="text-green-700">Server reachable &middot; {availableModels.length} model(s) found</span></>
                      : <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-destructive">{modelsData?.error ?? (modelsError instanceof Error ? modelsError.message : "Cannot reach server")}</span></>
                    }
                  </div>
                )}
              </div>

              {/* Model */}
              <div className="space-y-1">
                <Label>Model</Label>
                {availableModels.length > 0 ? (
                  <Select
                    value={provider === "ollama" ? ollamaModel : openaiModel}
                    onValueChange={(v) => provider === "ollama" ? setOllamaModel(v) : setOpenaiModel(v)}
                  >
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
                    value={provider === "ollama" ? ollamaModel : openaiModel}
                    onChange={(e) => provider === "ollama" ? setOllamaModel(e.target.value) : setOpenaiModel(e.target.value)}
                    placeholder={provider === "ollama" ? "llama3.2" : "model-name"}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {provider === "ollama"
                    ? <>Must support JSON mode. Recommended: <code>llama3.2</code>, <code>mistral</code>, <code>qwen2.5</code></>
                    : "Enter the model name served by your inference server."}
                </p>
              </div>

              {/* Timeout */}
              <div className="space-y-1">
                <Label>Timeout per page (seconds)</Label>
                <Input
                  type="number"
                  min={10}
                  max={300}
                  value={provider === "ollama" ? ollamaTimeout : openaiTimeout}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    provider === "ollama" ? setOllamaTimeout(v) : setOpenaiTimeout(v);
                  }}
                  className="w-28"
                />
                <p className="text-xs text-muted-foreground">LLM call timeout per case page. Increase for slower hardware.</p>
              </div>

              {saveError && (
                <p className="text-sm text-destructive">{saveError instanceof Error ? saveError.message : "Save failed"}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={handleSaveLlm} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testLlm(provider)}
                  disabled={isTesting}
                >
                  {isTesting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Testing...</> : "Test connection"}
                </Button>
              </div>

              {testResult && (
                <div className="border rounded-md p-3 text-sm space-y-1 bg-muted/30">
                  <div className="flex items-center gap-2">
                    {testResult.reachable
                      ? <CheckCircle className="h-4 w-4 text-green-600" />
                      : <XCircle className="h-4 w-4 text-destructive" />}
                    <span>{testResult.reachable ? "Server is reachable" : "Cannot reach server"}</span>
                  </div>
                  {testResult.reachable && (
                    <div className="flex items-center gap-2">
                      {testResult.model_available
                        ? <CheckCircle className="h-4 w-4 text-green-600" />
                        : <XCircle className="h-4 w-4 text-destructive" />}
                      <span>
                        Model <code className="text-xs bg-muted px-1 rounded">{currentModel}</code>{" "}
                        {testResult.model_available
                          ? "is available"
                          : provider === "ollama"
                            ? "not found \u2014 run: ollama pull " + currentModel
                            : "not found"}
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
          )}
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
            {isSaving ? "Saving..." : "Save"}
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
            Extraction pipeline: OG tags &rarr; JSON-LD &rarr; Heuristics
            {provider !== "none"
              ? <> &rarr; <Badge variant="default" className="text-xs ml-1">LLM ({currentModel || provider})</Badge></>
              : " \u2192 LLM (disabled)"}
          </p>
        </div>
      </section>
    </div>
  );
}
