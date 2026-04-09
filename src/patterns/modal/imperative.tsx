import { create } from 'zustand'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ---------------------------------------------------------------------------
// Store — open modals imperatively from anywhere, no JSX at callsite
// ---------------------------------------------------------------------------
interface ModalState {
  open: boolean
  title: string
  description: string
  onConfirm: (() => void) | null
  show: (opts: { title: string; description: string; onConfirm: () => void }) => void
  close: () => void
}

const useModalStore = create<ModalState>((set) => ({
  open: false,
  title: '',
  description: '',
  onConfirm: null,
  show: (opts) => set({ open: true, ...opts }),
  close: () => set({ open: false, onConfirm: null }),
}))

// ---------------------------------------------------------------------------
// Mount this once at the app root (here inlined for demo)
// ---------------------------------------------------------------------------
function ImperativeModalProvider() {
  const { open, title, description, onConfirm, close } = useModalStore()

  function handleConfirm() {
    onConfirm?.()
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Usage — call show() from a handler, no <Dialog> JSX needed
// ---------------------------------------------------------------------------
export default function ImperativeModal() {
  const show = useModalStore((s) => s.show)

  function handleDelete() {
    show({
      title: 'Delete record?',
      description: 'This cannot be undone.',
      onConfirm: () => console.log('Deleted!'),
    })
  }

  function handleArchive() {
    show({
      title: 'Archive record?',
      description: 'You can restore it later.',
      onConfirm: () => console.log('Archived!'),
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <p className="text-sm text-muted-foreground">
        Modals opened imperatively via a Zustand store. No{' '}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;Dialog&gt;</code> at callsite.
      </p>
      <div className="flex gap-2">
        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        <Button variant="outline" onClick={handleArchive}>Archive</Button>
      </div>

      {/* Mount provider once — normally this lives in your root layout */}
      <ImperativeModalProvider />
    </div>
  )
}
