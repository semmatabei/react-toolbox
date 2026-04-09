import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const step1Schema = z.object({
  name: z.string().min(2, 'Required'),
  email: z.string().email('Invalid email'),
})

const step2Schema = z.object({
  company: z.string().min(1, 'Required'),
  role: z.string().min(1, 'Required'),
})

const step3Schema = z.object({
  password: z.string().min(8, 'Min 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ['confirm'],
})

type Step1 = z.infer<typeof step1Schema>
type Step2 = z.infer<typeof step2Schema>
type Step3 = z.infer<typeof step3Schema>

const STEPS = ['Account', 'Profile', 'Security']

export default function MultiStepForm() {
  const [step, setStep] = useState(0)
  const [collected, setCollected] = useState<Partial<Step1 & Step2 & Step3>>({})
  const [done, setDone] = useState(false)

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema), defaultValues: collected })
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema), defaultValues: collected })
  const form3 = useForm<Step3>({ resolver: zodResolver(step3Schema) })

  function next1(data: Step1) { setCollected((c) => ({ ...c, ...data })); setStep(1) }
  function next2(data: Step2) { setCollected((c) => ({ ...c, ...data })); setStep(2) }
  async function submit(data: Step3) {
    await new Promise((r) => setTimeout(r, 600))
    console.log('Final:', { ...collected, ...data })
    setDone(true)
  }

  if (done) return (
    <div className="rounded-lg border border-border p-6 text-center space-y-3">
      <p className="text-sm font-medium">All done! Check console for values.</p>
      <Button variant="outline" size="sm" onClick={() => { setStep(0); setCollected({}); setDone(false) }}>Start over</Button>
    </div>
  )

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Step indicator */}
      <div className="flex border-b border-border">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
              i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-muted text-muted-foreground' : 'text-muted-foreground'
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      <div className="p-6">
        {step === 0 && (
          <form onSubmit={form1.handleSubmit(next1)} className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="John Doe" {...form1.register('name')} />
              {form1.formState.errors.name && <p className="text-xs text-destructive">{form1.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" placeholder="john@example.com" {...form1.register('email')} />
              {form1.formState.errors.email && <p className="text-xs text-destructive">{form1.formState.errors.email.message}</p>}
            </div>
            <Button type="submit">Next</Button>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={form2.handleSubmit(next2)} className="space-y-4">
            <div className="space-y-1">
              <Label>Company</Label>
              <Input placeholder="Acme Inc." {...form2.register('company')} />
              {form2.formState.errors.company && <p className="text-xs text-destructive">{form2.formState.errors.company.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Input placeholder="Engineer" {...form2.register('role')} />
              {form2.formState.errors.role && <p className="text-xs text-destructive">{form2.formState.errors.role.message}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setStep(0)}>Back</Button>
              <Button type="submit">Next</Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={form3.handleSubmit(submit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" {...form3.register('password')} />
              {form3.formState.errors.password && <p className="text-xs text-destructive">{form3.formState.errors.password.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="••••••••" {...form3.register('confirm')} />
              {form3.formState.errors.confirm && <p className="text-xs text-destructive">{form3.formState.errors.confirm.message}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" disabled={form3.formState.isSubmitting}>
                {form3.formState.isSubmitting ? 'Submitting…' : 'Finish'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
