import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { FieldError, FieldLabel, Input } from "./field";

type NativeTemporalProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
>;

export interface TemporalFieldProps extends NativeTemporalProps {
  id: string;
  label: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  error?: ReactNode;
}

function describedBy(
  id: string,
  error: ReactNode | undefined,
): string | undefined {
  return error ? `${id}-error` : undefined;
}

export function DateField({
  id,
  label,
  value,
  onValueChange,
  error,
  ...props
}: TemporalFieldProps) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...props}
        id={id}
        type="date"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onValueChange(event.target.value)
        }
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error)}
      />
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}

export function TimeField({
  id,
  label,
  value,
  onValueChange,
  error,
  step = 60,
  ...props
}: TemporalFieldProps) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...props}
        id={id}
        type="time"
        step={step}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onValueChange(event.target.value)
        }
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error)}
      />
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}

export interface DateRangeFieldProps {
  legend: ReactNode;
  startId: string;
  startLabel: ReactNode;
  startValue: string;
  endId: string;
  endLabel: ReactNode;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  error?: ReactNode;
  disabled?: boolean;
  required?: boolean;
}

export function DateRangeField({
  legend,
  startId,
  startLabel,
  startValue,
  endId,
  endLabel,
  endValue,
  onStartChange,
  onEndChange,
  error,
  disabled,
  required,
}: DateRangeFieldProps) {
  const errorId = `${startId}-${endId}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium text-foreground">
        {legend}
      </legend>
      <div className="grid gap-4 md:grid-cols-2">
        <DateField
          id={startId}
          label={startLabel}
          value={startValue}
          onValueChange={onStartChange}
          max={endValue || undefined}
          disabled={disabled}
          required={required}
        />
        <DateField
          id={endId}
          label={endLabel}
          value={endValue}
          onValueChange={onEndChange}
          min={startValue || undefined}
          disabled={disabled}
          required={required}
        />
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </fieldset>
  );
}
