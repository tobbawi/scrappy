import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Company } from "@/lib/api";

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: api.companies.list,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.companies.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}
