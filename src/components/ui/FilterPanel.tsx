"use client";

import { useState, type ReactNode } from "react";
import { Filter } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface FilterPanelProps<T> {
  value: T;
  defaultValue: T;
  activeCount: number;
  onApply: (next: T) => void;
  renderFields: (draft: T, setDraft: (patch: Partial<T>) => void) => ReactNode;
}

/** Global filter interaction pattern: a Filter button opens a panel of
 * staged fields, committed only on Apply (not live), plus a Clear Filter
 * button that resets to defaultValue immediately. Reused across Orders,
 * Bills, Audit Logs, Analytics, etc. */
export function FilterPanel<T>({
  value,
  defaultValue,
  activeCount,
  onApply,
  renderFields,
}: FilterPanelProps<T>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraftState] = useState<T>(value);

  function openPanel() {
    setDraftState(value);
    setOpen(true);
  }

  function setDraft(patch: Partial<T>) {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }

  function handleApply() {
    onApply(draft);
    setOpen(false);
  }

  function handleClear() {
    onApply(defaultValue);
    setOpen(false);
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={openPanel}>
          <Filter size={16} /> Filter{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" onClick={() => onApply(defaultValue)}>
            Clear Filter
          </Button>
        )}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={handleClear}>
              Clear
            </Button>
            <Button fullWidth onClick={handleApply}>
              Apply
            </Button>
          </div>
        }
      >
        {open && <div className="flex flex-col gap-4">{renderFields(draft, setDraft)}</div>}
      </Modal>
    </>
  );
}
