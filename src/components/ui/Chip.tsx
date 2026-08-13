import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  tone?: "default" | "danger" | "warning";
}

const toneActiveClasses: Record<NonNullable<ChipProps["tone"]>, string> = {
  default: "bg-primary text-primary-foreground border-primary",
  danger: "bg-danger text-white border-danger",
  warning: "bg-warning text-white border-warning",
};

export function Chip({ active, tone = "default", className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? toneActiveClasses[tone]
          : "border-border bg-surface text-foreground hover:bg-black/5 dark:hover:bg-white/5",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
