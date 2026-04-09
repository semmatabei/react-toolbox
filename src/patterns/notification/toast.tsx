import { Toaster, toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function Toast() {
  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <p className="text-sm text-muted-foreground">Toast notifications via Sonner.</p>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => toast.success('Saved successfully!')}>
          Success
        </Button>
        <Button size="sm" variant="destructive" onClick={() => toast.error('Something went wrong.')}>
          Error
        </Button>
        <Button size="sm" variant="outline" onClick={() => toast.warning('Check your input.')}>
          Warning
        </Button>
        <Button size="sm" variant="secondary" onClick={() => toast.info('New update available.')}>
          Info
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            toast.promise(new Promise((r) => setTimeout(r, 1500)), {
              loading: 'Saving…',
              success: 'Saved!',
              error: 'Failed.',
            })
          }
        >
          Promise
        </Button>
      </div>

      <Toaster position="bottom-right" richColors />
    </div>
  )
}
