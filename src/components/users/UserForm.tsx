"use client";

import { useState } from "react";
import type { SafeUser } from "@/types";
import { createUserSchema, updateUserSchema } from "@/lib/validation/user.schema";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

export interface UserFormProps {
  mode: "create" | "edit";
  user?: SafeUser;
  onSubmit: (values: {
    name: string;
    username?: string;
    password?: string;
    role: "ADMIN" | "STAFF";
    pin?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function UserForm({ mode, user, onSubmit, onCancel }: UserFormProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">(user?.role ?? "STAFF");
  const [pin, setPin] = useState(user?.pin ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const candidate =
      mode === "create"
        ? { name, username, password, role, pin }
        : { name, role, pin };
    const schema = mode === "create" ? createUserSchema : updateUserSchema;
    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") next[field] = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        mode === "create"
          ? { name, username, password, role, pin }
          : { name, role, pin },
      );
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      {mode === "create" ? (
        <>
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
        </>
      ) : (
        <Input label="Username" value={user?.username ?? ""} disabled />
      )}
      <SegmentedControl
        label="Role"
        options={[
          { value: "STAFF" as const, label: "Staff" },
          { value: "ADMIN" as const, label: "Admin" },
        ]}
        value={role}
        onChange={setRole}
      />
      <Input
        label="Staff PIN (optional)"
        hint="Separate from the shared Admin PIN — used for staff-level authorization"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        error={errors.pin}
      />
      {errors.form && <p className="text-sm text-danger">{errors.form}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Add User" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
