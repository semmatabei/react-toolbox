import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldGroup, FieldSet, FieldLegend, FieldDescription, FieldSeparator } from "@/components/ui/field";
import { FieldController, FormController, defineFields } from "@/components/base/form/field-controller";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  age: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 18, "Must be at least 18"),
  newsletter: z.boolean().optional(),
  teamName: z.string().min(1, "Required"),
  members: z.array(z.object({ name: z.string().min(1, "Required"), email: z.string().email("Invalid email") })).min(1, "Add at least one member"),
});

type FormValues = z.infer<typeof schema>;

const personalFields = defineFields<Pick<FormValues, "name" | "email" | "age" | "newsletter">>()({
  name: { label: "Name", description: "Your full name", helper: "First and last name", required: true },
  email: { label: "Email", required: true },
  age: { label: "Age", description: "Your age in years" },
  newsletter: { label: "Receive Newsletter", optional: true, inlineLabel: "Receive Newsletter" },
});

const teamFields = defineFields<Pick<FormValues, "teamName">>()({
  teamName: { label: "Team Name", required: true },
});

const memberFields = {
  name: { label: "Name", description: "Full Name", className: "flex-1", labelClassName: "flex-0 whitespace-nowrap mr-4" },
  email: { label: "Email", description: "Active Email", className: "flex-1", labelClassName: "flex-0 whitespace-nowrap mr-4" },
};

function CombinedForm({ orientation }: { orientation: "horizontal" | "vertical" }) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { members: [{ name: "", email: "" }] },
  });
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
    reset,
  } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: "members" });

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
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Personal Information</FieldLegend>
          <FieldDescription>Please fill out the form below with your personal information.</FieldDescription>
          <FieldGroup>
            <FieldController {...personalFields.name} render={({ field, id }) => <Input id={id} placeholder="John Doe" {...field} />} />
            <FieldController {...personalFields.email} render={({ field, id }) => <Input id={id} type="email" placeholder="john@example.com" {...field} />} />
            <FieldController {...personalFields.age} render={({ field, id }) => <Input id={id} type="number" placeholder="25" {...field} />} />
            <FieldController {...personalFields.newsletter} render={({ field, id }) => <Checkbox id={id} checked={field.value ?? false} onCheckedChange={field.onChange} />} />
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Team</FieldLegend>
          <FieldDescription>Tell us about your team.</FieldDescription>
          <FieldGroup>
            <FieldController {...teamFields.teamName} render={({ field, id }) => <Input id={id} placeholder="Engineering" {...field} />} />
          </FieldGroup>

          <div className="space-y-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs/relaxed font-medium">Members</span>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", email: "" })}>
                <Plus className="size-3 mr-1" /> Add
              </Button>
            </div>

            {fields.map((_, i) => (
              <div key={fields[i].id} className="flex gap-6 items-start">
                <FieldController name={`members.${i}.name`} {...memberFields.name} render={({ field, id }) => <Input id={id} placeholder="Name" {...field} />} />
                <FieldController name={`members.${i}.email`} {...memberFields.email} render={({ field, id }) => <Input id={id} placeholder="Email" {...field} />} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} disabled={fields.length === 1}>
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </FieldSet>
      </FieldGroup>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit"}
      </Button>
    </FormController>
  );
}

export default function DynamicFields() {
  return (
    <div className="grid gap-6 items-start grid-cols-[400px_auto]">
      <CombinedForm orientation="vertical" />
      <CombinedForm orientation="horizontal" />
    </div>
  );
}
