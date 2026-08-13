"use client";

import { Chip } from "./Chip";

export interface MultiSelectOption {
  id: string;
  label: string;
}

export interface MultiSelectChipsProps {
  label?: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  emptyHint?: string;
}

export function MultiSelectChips({
  label,
  options,
  selected,
  onChange,
  emptyHint = "No categories yet",
}: MultiSelectChipsProps) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      {options.length === 0 ? (
        <p className="text-sm text-muted">{emptyHint}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Chip
              key={option.id}
              active={selected.includes(option.id)}
              onClick={() => toggle(option.id)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
