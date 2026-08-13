import clsx from "clsx";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      <div className="grid gap-1 rounded-lg border border-border bg-surface p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              "h-10 rounded-md px-2 text-sm font-medium transition-colors",
              value === option.value
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-black/5 dark:hover:bg-white/5",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
