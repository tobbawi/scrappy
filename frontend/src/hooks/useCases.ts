import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CaseUpdate } from "@/lib/api";

interface CaseFilters {
  company?: string;
  industry?: string;
  country?: string;
  q?: string;
  since?: string;
  new_only?: boolean;
  sort?: "first_seen" | "publish_date";
  page?: number;
  per_page?: number;
}

export function useCases(filters: CaseFilters = {}) {
  return useQuery({
    queryKey: ["cases", filters],
    queryFn: () => api.cases.list(filters as Record<string, string | number | boolean | undefined>),
  });
}

export function useCase(id: string) {
  return useQuery({
    queryKey: ["cases", id],
    queryFn: () => api.cases.get(id),
    enabled: !!id,
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CaseUpdate }) =>
      api.cases.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.setQueryData(["cases", updated.id], updated);
    },
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.cases.delete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.removeQueries({ queryKey: ["cases", id] });
    },
  });
}
