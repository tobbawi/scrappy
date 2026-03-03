import { useState } from "react";
import { useUpdateCompany } from "@/hooks/useCompanies";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";
import type { Company } from "@/lib/api";

export function EditCompanyDialog({ company }: { company: Company }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(company.name);
  const [url, setUrl] = useState(company.listing_url);
  const [fetcherType, setFetcherType] = useState<"static" | "dynamic" | "stealthy">(company.fetcher_type);
  const [pathPrefix, setPathPrefix] = useState(company.case_path_prefix ?? "");
  const { mutateAsync, isPending, error } = useUpdateCompany();

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(company.name);
      setUrl(company.listing_url);
      setFetcherType(company.fetcher_type);
      setPathPrefix(company.case_path_prefix ?? "");
    }
    setOpen(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutateAsync({
        id: company.id,
        data: {
          name,
          listing_url: url,
          fetcher_type: fetcherType,
          case_path_prefix: pathPrefix || null,
        },
      });
      setOpen(false);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline" className="h-7 w-7" title="Edit company">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Company name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" required />
          </div>
          <div className="space-y-1">
            <Label>Listing URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://acme.com/customers" type="url" required />
          </div>
          <div className="space-y-1">
            <Label>Fetcher type</Label>
            <Select value={fetcherType} onValueChange={(v) => setFetcherType(v as "static" | "dynamic" | "stealthy")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">Static (fast, no JS)</SelectItem>
                <SelectItem value="dynamic">Dynamic (Playwright)</SelectItem>
                <SelectItem value="stealthy">Stealthy (Playwright + headers)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Case path prefix (optional)</Label>
            <Input value={pathPrefix} onChange={(e) => setPathPrefix(e.target.value)} placeholder="/customers/" />
            <p className="text-xs text-muted-foreground">If set, only URLs starting with this path are treated as cases.</p>
          </div>
          {error && <p className="text-sm text-destructive">{String(error)}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save Changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
