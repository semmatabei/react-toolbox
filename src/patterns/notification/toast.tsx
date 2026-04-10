import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/custom/section-header";

export default function Toast() {
  function showWithAction() {
    const toastId = toast("File moved to Trash", {
      action: {
        label: "Undo",
        onClick: () => toast.success("Restored!", { id: toastId }),
      },
    });
  }

  return (
    <div className="space-y-6 rounded-lg border border-border p-6">
      <SectionHeader description="Toast notifications via Sonner." />

      <div className="space-y-3">
        <SectionHeader title="Variants" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => toast.success("Saved successfully!")}>
            Success
          </Button>
          <Button size="sm" variant="destructive" onClick={() => toast.error("Something went wrong.")}>
            Error
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.warning("Check your input.")}>
            Warning
          </Button>
          <Button size="sm" variant="secondary" onClick={() => toast.info("New update available.")}>
            Info
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast.promise(new Promise((r) => setTimeout(r, 1500)), {
                loading: "Saving…",
                success: "Saved!",
                error: "Failed.",
              })
            }
          >
            Promise
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeader title="With action" description="Toast with an undo action button." />
        <Button size="sm" variant="outline" onClick={showWithAction}>
          Move to Trash
        </Button>
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
}
