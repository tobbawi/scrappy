import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Company, CompanyDetail, PaginatedCompanies } from "@/lib/api";

export function useCompanies(page = 1, per_page = 100) {
  return useQuery<PaginatedCompanies>({
    queryKey: ["companies", page, per_page],
    queryFn: () => api.companies.list(page, per_page),
  });
}

export function useCompany(id: string) {
  return useQuery<CompanyDetail>({
    queryKey: ["companies", id],
    queryFn: () => api.companies.get(id),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.companies.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
      api.companies.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.companies.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}
