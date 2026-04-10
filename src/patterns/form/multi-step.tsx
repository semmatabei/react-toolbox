import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldGroup } from "@/components/ui/field";
import { FieldController, FormController, defineFields } from "@/components/base/form/field-controller";

const step1Schema = z.object({
  name: z.string().min(2, "Required"),
  email: z.string().email("Invalid email"),
});

const step2Schema = z.object({
  company: z.string().min(1, "Required"),
  role: z.string().min(1, "Required"),
});

const step3Schema = z
  .object({
    password: z.string().min(8, "Min 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;

const step1Fields = defineFields<Step1>()({ name: { label: "Name", required: true }, email: { label: "Email", required: true } });

const step2Fields = defineFields<Step2>()({ company: { label: "Company", required: true }, role: { label: "Role", required: true } });

const step3Fields = defineFields<Step3>()({ password: { label: "Password", required: true }, confirm: { label: "Confirm Password", required: true } });

const STEPS = ["Account", "Profile", "Security"];

export default function MultiStepForm() {
  const [step, setStep] = useState(0);
  const [collected, setCollected] = useState<Partial<Step1 & Step2 & Step3>>({});

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema), defaultValues: collected });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema), defaultValues: collected });
  const form3 = useForm<Step3>({ resolver: zodResolver(step3Schema) });

  function next1(data: Step1) {
    setCollected((c) => ({ ...c, ...data }));
    setStep(1);
  }
  function next2(data: Step2) {
    setCollected((c) => ({ ...c, ...data }));
    setStep(2);
  }
  async function submit(data: Step3) {
    await new Promise((r) => setTimeout(r, 600));
    console.log("Final:", { ...collected, ...data });
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Step indicator */}
      <div className="flex border-b border-border">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
              i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-muted text-muted-foreground" : "text-muted-foreground"
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      <div className="p-6">
        {step === 0 && (
          <FormController methods={form1} onSubmit={form1.handleSubmit(next1)} className="space-y-4">
            <FieldGroup>
              <FieldController {...step1Fields.name} render={({ field, id }) => <Input id={id} placeholder="John Doe" {...field} />} />
              <FieldController {...step1Fields.email} render={({ field, id }) => <Input id={id} type="email" placeholder="john@example.com" {...field} />} />
            </FieldGroup>
            <Button type="submit">Next</Button>
          </FormController>
        )}

        {step === 1 && (
          <FormController methods={form2} onSubmit={form2.handleSubmit(next2)} className="space-y-4">
            <FieldGroup>
              <FieldController {...step2Fields.company} render={({ field, id }) => <Input id={id} placeholder="Acme Inc." {...field} />} />
              <FieldController {...step2Fields.role} render={({ field, id }) => <Input id={id} placeholder="Engineer" {...field} />} />
            </FieldGroup>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button type="submit">Next</Button>
            </div>
          </FormController>
        )}

        {step === 2 && (
          <FormController methods={form3} onSubmit={form3.handleSubmit(submit)} className="space-y-4">
            <FieldGroup>
              <FieldController {...step3Fields.password} render={({ field, id }) => <Input id={id} type="password" placeholder="••••••••" {...field} />} />
              <FieldController {...step3Fields.confirm} render={({ field, id }) => <Input id={id} type="password" placeholder="••••••••" {...field} />} />
            </FieldGroup>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" disabled={form3.formState.isSubmitting}>
                {form3.formState.isSubmitting ? "Submitting…" : "Finish"}
              </Button>
            </div>
          </FormController>
        )}
      </div>
    </div>
  );
}
