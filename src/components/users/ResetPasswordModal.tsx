"use client";

import { useState } from "react";
import type { SafeUser } from "@/types";
import { resetPasswordSchema } from "@/lib/validation/user.schema";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface ResetPasswordModalProps {
  user: SafeUser | null;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}

export function ResetPasswordModal({ user, onClose, onSubmit }: ResetPasswordModalProps) {
  return (
    <Modal open={!!user} onClose={onClose} title={user ? `Reset Password — ${user.name}` : ""}>
      {user && <ResetPasswordForm onSubmit={onSubmit} onCancel={onClose} />}
    </Modal>
  );
}

function ResetPasswordForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (password: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="New Password"
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error}
      />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Saving…" : "Reset Password"}
        </Button>
      </div>
    </form>
  );
}
