import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AppSettings } from "@/lib/api";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AppSettings>) => api.settings.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useLlmModels(provider: string) {
  return useQuery({
    queryKey: ["llm-models", provider],
    queryFn: () => api.settings.llmModels(provider),
    enabled: provider !== "none",
    retry: false,
    staleTime: 30_000,
  });
}

export function useLlmTest() {
  return useMutation({
    mutationFn: (provider: string) => api.settings.llmTest(provider),
  });
}

// Keep legacy hooks for backward compat
export function useOllamaModels() {
  return useQuery({
    queryKey: ["ollama-models"],
    queryFn: api.settings.ollamaModels,
    retry: false,
    staleTime: 30_000,
  });
}

export function useOllamaTest() {
  return useMutation({
    mutationFn: api.settings.ollamaTest,
  });
}
