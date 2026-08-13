"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";

export interface PinPromptProps {
  open: boolean;
  title?: string;
  description?: string;
  onConfirm: (pin: string) => Promise<void>;
  onCancel: () => void;
}

export function PinPrompt({
  open,
  title = "Enter Admin PIN",
  description,
  onConfirm,
  onCancel,
}: PinPromptProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {open && <PinPromptForm description={description} onConfirm={onConfirm} onCancel={onCancel} />}
    </Modal>
  );
}

interface PinPromptFormProps {
  description?: string;
  onConfirm: (pin: string) => Promise<void>;
  onCancel: () => void;
}

function PinPromptForm({ description, onConfirm, onCancel }: PinPromptFormProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!pin) {
      setError("PIN is required");
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await onConfirm(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {description && <p className="text-sm text-muted">{description}</p>}
      <Input
        label="PIN"
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        error={error}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleConfirm();
          }
        }}
      />
      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button fullWidth onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Checking…" : "Confirm"}
        </Button>
      </div>
    </div>
  );
}
