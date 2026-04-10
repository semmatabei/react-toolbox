import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShowDialog, DialogProvider } from "@/components/base/dialog/show-dialog";
import { ShowSimpleDialog } from "@/components/base/dialog/simple-dialog";
import { SectionHeader } from "@/components/base/section-header";

function UserInfoDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Information</DialogTitle>
          <DialogDescription>Enter your name and email address below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="John Doe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="john@example.com" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BasicDialog() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
      <SectionHeader title="Custom dialog" description="Pass a render function to ShowDialog for full control over content.">
        <Button onClick={() => ShowDialog(({ open, setOpen }) => <UserInfoDialog open={open} setOpen={setOpen} />)}>Edit User</Button>
      </SectionHeader>

      <div className="border-t border-border pt-4">
        <SectionHeader title="Simple dialog" description="Pass title, body, and onConfirm — no JSX needed.">
          <Button
            variant="outline"
            onClick={() => ShowSimpleDialog({ title: "Save changes?", body: "Your unsaved changes will be saved to the server.", confirmLabel: "Save", onConfirm: () => console.log("Saved!") })}
          >
            Save Changes
          </Button>
        </SectionHeader>
      </div>

      <DialogProvider />
    </div>
  );
}
