import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

const baseStyles = [
  'w-full rounded-xl',
  'px-3 py-2.5',
  'text-sm text-foreground caret-foreground',
  'bg-input',
  'border border-input-border',
  'transition duration-150',
  'focus:outline-none focus:ring-2 focus:ring-input-focus-ring',
];

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', error = false, id, name, ...props },
  ref,
) {
  return (
    <input
      {...props}
      aria-invalid={error || props['aria-invalid'] === true}
      className={cn(baseStyles, className)}
      id={id}
      name={name ?? id}
      ref={ref}
    />
  );
});

Input.displayName = 'Input';
