import { notification, NotificationProvider } from "@/components/base/notification";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/base/section-header";

export default function Toast() {
  function showWithAction() {
    const toastId = notification.show("File moved to Trash", {
      action: {
        label: "Undo",
        onClick: () => notification.success("Restored!", { id: toastId }),
      },
    });
  }

  return (
    <div className="space-y-6 rounded-lg border border-border p-6">
      <SectionHeader description="Toast notifications via Sonner." />

      <div className="space-y-3">
        <SectionHeader title="Variants" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => notification.success("Saved successfully!")}>
            Success
          </Button>
          <Button size="sm" variant="destructive" onClick={() => notification.error("Something went wrong.")}>
            Error
          </Button>
          <Button size="sm" variant="outline" onClick={() => notification.warning("Check your input.")}>
            Warning
          </Button>
          <Button size="sm" variant="secondary" onClick={() => notification.info("New update available.")}>
            Info
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              notification.promise(new Promise((r) => setTimeout(r, 1500)), {
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

      <NotificationProvider position="bottom-right" />
    </div>
  );
}
