import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

const schema = z.object({
  teamName: z.string().min(1, "Required"),
  members: z
    .array(
      z.object({
        name: z.string().min(1, "Required"),
        email: z.string().email("Invalid email"),
      }),
    )
    .min(1, "Add at least one member"),
});

type FormValues = z.infer<typeof schema>;

export default function DynamicFields() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitSuccessful },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { teamName: "", members: [{ name: "", email: "" }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "members" });

  function onSubmit(data: FormValues) {
    console.log("Submitted:", data);
  }

  if (isSubmitSuccessful)
    return (
      <div className="rounded-lg border border-border p-6 text-center space-y-3">
        <p className="text-sm font-medium">Submitted! Check console.</p>
        <Button variant="outline" size="sm" onClick={() => reset()}>
          Reset
        </Button>
      </div>
    );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-lg border border-border p-6">
      <div className="space-y-1">
        <Label>Team Name</Label>
        <Input placeholder="Engineering" {...register("teamName")} />
        {errors.teamName && <p className="text-xs text-destructive">{errors.teamName.message}</p>}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Members</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", email: "" })}>
            <Plus className="size-3 mr-1" /> Add
          </Button>
        </div>

        {fields.map((field, i) => (
          <div key={field.id} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1">
              <Input placeholder="Name" {...register(`members.${i}.name`)} />
              {errors.members?.[i]?.name && <p className="text-xs text-destructive">{errors.members[i]?.name?.message}</p>}
            </div>
            <div className="flex-1 space-y-1">
              <Input placeholder="Email" {...register(`members.${i}.email`)} />
              {errors.members?.[i]?.email && <p className="text-xs text-destructive">{errors.members[i]?.email?.message}</p>}
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} disabled={fields.length === 1} className="mt-0.5">
              <Trash2 className="size-3 text-destructive" />
            </Button>
          </div>
        ))}

        {errors.members?.root && <p className="text-xs text-destructive">{errors.members.root.message}</p>}
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
}
