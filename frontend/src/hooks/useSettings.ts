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
