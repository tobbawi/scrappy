import { useState } from "react";
import { useCreateCompany } from "@/hooks/useCompanies";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export function AddCompanyDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [fetcherType, setFetcherType] = useState("static");
  const [pathPrefix, setPathPrefix] = useState("");
  const { mutateAsync, isPending, error } = useCreateCompany();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutateAsync({
        name,
        listing_url: url,
        fetcher_type: fetcherType,
        case_path_prefix: pathPrefix || null,
      });
      setOpen(false);
      setName("");
      setUrl("");
      setPathPrefix("");
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Company</DialogTitle>
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
            <Select value={fetcherType} onValueChange={setFetcherType}>
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
            <Button type="submit" disabled={isPending}>{isPending ? "Adding…" : "Add Company"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
