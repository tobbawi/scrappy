import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useScrapeJobs() {
  return useQuery({
    queryKey: ["scrape-jobs"],
    queryFn: api.scrape.jobs,
    refetchInterval: (query) => {
      const jobs = query.state.data;
      if (!jobs) return 5000;
      const hasActive = jobs.some((j) => j.status === "running" || j.status === "queued");
      return hasActive ? 2000 : 10_000;
    },
  });
}

export function useScrapeJob(id: string, enabled = true) {
  return useQuery({
    queryKey: ["scrape-jobs", id],
    queryFn: () => api.scrape.job(id),
    enabled: enabled && !!id,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job) return 2000;
      return job.status === "running" || job.status === "queued" ? 2000 : false;
    },
  });
}

export function useTriggerScrape() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string = "all") => api.scrape.trigger(companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scrape-jobs"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
