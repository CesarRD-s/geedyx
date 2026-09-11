import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { FieldLabel, Input } from "./field";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
}

/**
 * Labeled search field with a search glyph. The label is always visible and
 * wired to the input; placeholders never replace labels.
 */
export function SearchInput({
  id,
  label,
  className = "",
  ...props
}: SearchInputProps) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <Input id={id} type="search" className="pl-9" {...props} />
      </div>
    </div>
  );
}