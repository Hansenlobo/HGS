import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const fieldClasses =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <label className="flex flex-col gap-1" htmlFor={inputId}>
        {label && <span className="text-sm font-medium text-foreground">{label}</span>}
        <input
          ref={ref}
          id={inputId}
          className={clsx(fieldClasses, error && "border-danger", className)}
          {...props}
        />
        {hint && !error && <span className="text-xs text-muted">{hint}</span>}
        {error && <span className="text-xs text-danger">{error}</span>}
      </label>
    );
  },
);
Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <label className="flex flex-col gap-1" htmlFor={inputId}>
        {label && <span className="text-sm font-medium text-foreground">{label}</span>}
        <textarea
          ref={ref}
          id={inputId}
          className={clsx(
            "min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary",
            error && "border-danger",
            className,
          )}
          {...props}
        />
        {hint && !error && <span className="text-xs text-muted">{hint}</span>}
        {error && <span className="text-xs text-danger">{error}</span>}
      </label>
    );
  },
);
Textarea.displayName = "Textarea";
