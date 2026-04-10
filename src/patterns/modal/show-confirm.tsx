import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShowConfirm } from "@/components/base/dialog/show-confirm";
import { DialogProvider } from "@/components/base/dialog/show-dialog";

type Result = { label: string; confirmed: boolean } | null;

export default function ShowConfirmation() {
  const [result, setResult] = useState<Result>(null);

  async function handleDelete() {
    const confirmed = await ShowConfirm("Delete item?", "This action cannot be undone. The item will be permanently removed.", { variant: "destructive" });
    setResult({ label: "Delete", confirmed });
  }

  async function handleArchive() {
    const confirmed = await ShowConfirm("Archive item?", "The item will be moved to the archive and can be restored later.");
    setResult({ label: "Archive", confirmed });
  }

  async function handlePublish() {
    const confirmed = await ShowConfirm("Publish changes?", "This will make your changes visible to all users immediately.");
    setResult({ label: "Publish", confirmed });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <p className="text-sm text-muted-foreground">
        <code className="text-xs bg-muted px-1 py-0.5 rounded">ShowConfirm</code> returns a promise — await the result without any Dialog JSX at the callsite.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" onClick={handleDelete}>
          Delete
        </Button>
        <Button variant="outline" onClick={handleArchive}>
          Archive
        </Button>
        <Button onClick={handlePublish}>Publish</Button>
      </div>

      {result && (
        <p className="text-sm">
          <span className="font-medium">{result.label}:</span> <Badge variant={result.confirmed ? "default" : "secondary"}>{result.confirmed ? "Confirmed" : "Cancelled"}</Badge>
        </p>
      )}

      <DialogProvider />
    </div>
  );
}
