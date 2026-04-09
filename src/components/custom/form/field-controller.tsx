import { useId } from "react";
import { Controller, type ControllerFieldState, type ControllerProps, type ControllerRenderProps, type FieldPath, type FieldValues } from "react-hook-form";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

type RenderArgs<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = {
  /** Stable id — pass to the input: `id={id}` and `aria-invalid={fieldState.invalid}` */
  id: string;
  field: ControllerRenderProps<TFieldValues, TName> & { "aria-invalid": boolean };
  fieldState: ControllerFieldState;
};

export type FieldControllerProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = Omit<
  ControllerProps<TFieldValues, TName>,
  "render"
> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
  helper?: React.ReactNode;
  orientation?: "vertical" | "horizontal" | "responsive";
  /** Show a red asterisk after the label/title */
  required?: boolean;
  /** Show a muted "(Optional)" suffix after the label/title */
  optional?: boolean;
  className?: string;
  /** Extra className applied to the `FieldContent` wrapper in horizontal/responsive layouts. */
  labelClassName?: string;
  /** Render an inline label beside the control (for checkbox/radio). Receives the same `id` as the control. */
  inlineLabel?: React.ReactNode;
  render: (args: RenderArgs<TFieldValues, TName>) => React.ReactNode;
};

/**
 * Define a fields config object — automatically injects `name: K` as a literal type
 * so you can spread entries directly onto `FieldController` without `"x" as const`.
 *
 * @example
 * const fields = defineFields<FormValues>()({ email: { label: "Email", required: true } });
 * // fields.email.name === "email" (literal type, not string)
 */
export function defineFields<TFieldValues extends FieldValues>() {
  return function <T extends Record<keyof TFieldValues, object>>(defs: T): { [K in keyof T]: T[K] & { name: K } } {
    return Object.fromEntries(Object.entries(defs).map(([k, v]) => [k, { ...v, name: k }])) as { [K in keyof T]: T[K] & { name: K } };
  };
}

function RequiredMark() {
  return <span className="text-destructive ml-0.5">*</span>;
}
function OptionalMark() {
  return <span className="text-muted-foreground font-normal ml-1">(Optional)</span>;
}

export function FieldController<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(props: FieldControllerProps<TFieldValues, TName>) {
  const { name, control, label, description, helper, orientation = "vertical", required, optional, className, labelClassName, inlineLabel, render, ...controllerProps } = props;
  const autoId = useId();
  const id = `field-${autoId}`;
  const isHorizontal = orientation === "horizontal" || orientation === "responsive";

  return (
    <Controller
      name={name}
      control={control}
      {...controllerProps}
      render={({ field, fieldState }) => {
        const invalid = fieldState.invalid;
        const control_ = render({ field: { ...field, "aria-invalid": invalid }, fieldState, id });

        const controlEl = inlineLabel ? (
          <div className="flex items-center gap-2">
            {control_}
            <FieldLabel htmlFor={id} className="font-normal text-muted-foreground">
              {inlineLabel}
            </FieldLabel>
          </div>
        ) : (
          control_
        );

        const subText = (
          <>
            {helper && <FieldDescription>{helper}</FieldDescription>}
            {invalid && <FieldError errors={[fieldState.error]} />}
          </>
        );

        return (
          <Field data-invalid={invalid || undefined} orientation={orientation} className={className}>
            <FieldContent className={labelClassName}>
              {label && (
                <FieldLabel htmlFor={id}>
                  {label}
                  {required && <RequiredMark />}
                  {optional && <OptionalMark />}
                </FieldLabel>
              )}
              {description && <FieldDescription>{description}</FieldDescription>}
            </FieldContent>
            {isHorizontal ? (
              <div className="flex flex-1 flex-col gap-1">
                {controlEl}
                {subText}
              </div>
            ) : (
              <>
                {controlEl}
                {subText}
              </>
            )}
          </Field>
        );
      }}
    />
  );
}
