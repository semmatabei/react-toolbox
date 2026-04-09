import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldGroup } from "@/components/ui/field";
import { FieldController, FormController, defineFields } from "@/components/custom/form/field-controller";
import { Plus, Trash2 } from "lucide-react";

const schema = z.object({
  teamName: z.string().min(1, "Required"),
  members: z.array(z.object({ name: z.string().min(1, "Required"), email: z.string().email("Invalid email") })).min(1, "Add at least one member"),
});

type FormValues = z.infer<typeof schema>;

const formFields = defineFields<{ teamName: string }>()({ teamName: { label: "Team Name", required: true } });

const memberFields = {
  name: { label: "Name" },
  email: { label: "Email" },
};

export default function DynamicFields() {
  const methods = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { control, handleSubmit } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: "members" });

  function onSubmit(data: FormValues) {
    console.log("Submitted:", data);
  }

  return (
    <FormController methods={methods} onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-lg border border-border p-6">
      <FieldGroup>
        <FieldController {...formFields.teamName} render={({ field, id }) => <Input id={id} placeholder="Engineering" {...field} />} />
      </FieldGroup>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs/relaxed font-medium">Members</span>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", email: "" })}>
            <Plus className="size-3 mr-1" /> Add
          </Button>
        </div>

        {fields.map((_, i) => (
          <div key={fields[i].id} className="flex gap-2 items-start">
            <FieldController name={`members.${i}.name`} {...memberFields.name} className="flex-1" render={({ field, id }) => <Input id={id} placeholder="Name" {...field} />} />
            <FieldController name={`members.${i}.email`} {...memberFields.email} className="flex-1" render={({ field, id }) => <Input id={id} placeholder="Email" {...field} />} />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} disabled={fields.length === 1} className="mt-5">
              <Trash2 className="size-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="submit">Submit</Button>
    </FormController>
  );
}
