import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, JobEvent } from "@/lib/api";

export function useScrapeJobs(companyId?: string) {
  return useQuery({
    queryKey: ["scrape-jobs", companyId],
    queryFn: () => api.scrape.jobs(companyId),
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

/** Subscribe to live SSE events for a scrape job. */
export function useJobStream(jobId: string) {
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [streamDone, setStreamDone] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;
    setEvents([]);
    setStreamDone(false);

    const es = new EventSource(`/api/scrape/jobs/${jobId}/stream`);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const event: JobEvent = JSON.parse(e.data);
        setEvents((prev) => [...prev, event]);
      } catch {
        // ignore malformed events
      }
    };

    es.addEventListener("done", () => {
      setStreamDone(true);
      es.close();
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [jobId]);

  return { events, connected, streamDone };
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
