import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldGroup, FieldSet, FieldLegend, FieldDescription } from "@/components/ui/field";
import { FieldController, FormController, defineFields } from "@/components/custom/form/field-controller";
import { Checkbox } from "@/components/ui/checkbox";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  age: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 18, "Must be at least 18"),
  newsletter: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

const fields = defineFields<FormValues>()({
  name: { label: "Name", description: "Your full name", helper: "First and last name", required: true },
  email: { label: "Email", required: true },
  age: { label: "Age", description: "Your age in years" },
  newsletter: { label: "Receive Newsletter", optional: true, inlineLabel: "Receive Newsletter" },
});

function PersonalInfoForm({ orientation }: { orientation: "horizontal" | "vertical" }) {
  const methods = useForm<FormValues>({ resolver: zodResolver(schema) });
  const {
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
    reset,
  } = methods;

  async function onSubmit(data: FormValues) {
    await new Promise((r) => setTimeout(r, 800));
    console.log("Submitted:", data);
  }

  if (isSubmitSuccessful) {
    return (
      <div className="rounded-lg border border-border p-6 text-center space-y-3">
        <p className="text-sm font-medium text-foreground">Submitted successfully!</p>
        <Button variant="outline" size="sm" onClick={() => reset()}>
          Reset
        </Button>
      </div>
    );
  }

  return (
    <FormController methods={methods} orientation={orientation} onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-border p-6">
      <FieldSet>
        <FieldLegend>Personal Information</FieldLegend>
        <FieldDescription>Please fill out the form below with your personal information.</FieldDescription>
        <FieldGroup>
          <FieldController {...fields.name} render={({ field, id }) => <Input id={id} placeholder="John Doe" {...field} />} />
          <FieldController {...fields.email} render={({ field, id }) => <Input id={id} type="email" placeholder="john@example.com" {...field} />} />
          <FieldController {...fields.age} render={({ field, id }) => <Input id={id} type="number" placeholder="25" {...field} />} />
          <FieldController {...fields.newsletter} render={({ field, id }) => <Checkbox id={id} checked={field.value ?? false} onCheckedChange={field.onChange} />} />
        </FieldGroup>
      </FieldSet>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit"}
      </Button>
    </FormController>
  );
}

export default function BasicForm() {
  return (
    <div className="grid gap-6 items-start grid-cols-[400px_auto]">
      <PersonalInfoForm orientation="vertical" />
      <PersonalInfoForm orientation="horizontal" />
    </div>
  );
}
