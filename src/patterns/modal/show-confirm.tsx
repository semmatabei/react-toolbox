import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShowConfirm } from "@/components/base/dialog/show-confirm";
import { DialogPortal } from "@/components/base/dialog/show-dialog";
import { SectionHeader } from "@/components/base/section-header";

type Result = { label: string; confirmed: boolean } | null;

export default function ShowConfirmation() {
  const [result, setResult] = useState<Result>(null);

  async function confirm(label: string, title: string, message: string, options?: Parameters<typeof ShowConfirm>[2]) {
    const confirmed = await ShowConfirm(title, message, options);
    setResult({ label, confirmed });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <SectionHeader description="ShowConfirm returns a promise — await the result without any Dialog JSX at the callsite." />

      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" onClick={() => confirm("Delete", "Delete item?", "This action cannot be undone. The item will be permanently removed.", { variant: "destructive" })}>
          Delete
        </Button>
        <Button variant="outline" onClick={() => confirm("Archive", "Archive item?", "The item will be moved to the archive and can be restored later.")}>
          Archive
        </Button>
        <Button onClick={() => confirm("Publish", "Publish changes?", "This will make your changes visible to all users immediately.")}>Publish</Button>
      </div>

      {result && (
        <p className="text-sm">
          <span className="font-medium">{result.label}:</span> <Badge variant={result.confirmed ? "default" : "secondary"}>{result.confirmed ? "Confirmed" : "Cancelled"}</Badge>
        </p>
      )}

      <DialogPortal />
    </div>
  );
}
