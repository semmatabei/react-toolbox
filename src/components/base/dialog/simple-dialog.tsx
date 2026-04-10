import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDialogStore } from "./use-dialog";

interface SimpleDialogOptions {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

function SimpleDialogModal({ title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onCancel }: SimpleDialogOptions) {
  const open = useDialogStore((s) => s.open);
  const setOpen = useDialogStore((s) => s.setOpen);

  function handleConfirm() {
    setOpen(false);
    onConfirm?.();
  }

  function handleCancel() {
    setOpen(false);
    onCancel?.();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {body && (
            <DialogDescription asChild>
              <div>{body}</div>
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button onClick={handleConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShowSimpleDialog(options: SimpleDialogOptions) {
  useDialogStore.getState().show(() => <SimpleDialogModal {...options} />);
}
