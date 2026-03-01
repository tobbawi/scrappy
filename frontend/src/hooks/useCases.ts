import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
