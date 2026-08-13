"use client";

import { useState } from "react";
import useSWR from "swr";
import type { SafeUser } from "@/types";
import { fetcher, postJson, patchJson } from "@/lib/fetcher";
import { formatDateTime } from "@/lib/formatDate";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { UserForm } from "./UserForm";
import { ResetPasswordModal } from "./ResetPasswordModal";

export interface UsersPageClientProps {
  initialUsers: SafeUser[];
}

type FormModalState = { mode: "create" } | { mode: "edit"; user: SafeUser } | null;

export function UsersPageClient({ initialUsers }: UsersPageClientProps) {
  const { showToast } = useToast();
  const { data: users, mutate } = useSWR<SafeUser[]>("/api/users", fetcher, {
    fallbackData: initialUsers,
  });
  const [formModal, setFormModal] = useState<FormModalState>(null);
  const [resetTarget, setResetTarget] = useState<SafeUser | null>(null);

  async function handleCreate(values: {
    name: string;
    username?: string;
    password?: string;
    role: "ADMIN" | "STAFF";
    pin?: string;
  }) {
    await postJson("/api/users", values);
    await mutate();
    setFormModal(null);
    showToast("User added");
  }

  async function handleUpdate(
    user: SafeUser,
    values: { name: string; role: "ADMIN" | "STAFF"; pin?: string },
  ) {
    await patchJson(`/api/users/${user.id}`, values);
    await mutate();
    setFormModal(null);
    showToast("User updated");
  }

  async function handleResetPassword(password: string) {
    if (!resetTarget) return;
    await postJson(`/api/users/${resetTarget.id}/reset-password`, { password });
    setResetTarget(null);
    showToast("Password reset");
  }

  async function handleToggleStatus(user: SafeUser) {
    try {
      await postJson(`/api/users/${user.id}/toggle-status`, {});
      await mutate();
      showToast(user.isActive ? "User disabled" : "User enabled");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update user", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-sm text-muted">Manage staff and admin accounts.</p>
        </div>
        <Button onClick={() => setFormModal({ mode: "create" })}>Add User</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last Login</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{user.name}</td>
                <td className="px-4 py-3 text-sm text-muted">{user.username}</td>
                <td className="px-4 py-3 text-sm text-foreground">{user.role === "ADMIN" ? "Admin" : "Staff"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      user.isActive
                        ? "inline-flex h-6 items-center rounded-full bg-success-bg px-2.5 text-xs font-medium text-primary"
                        : "inline-flex h-6 items-center rounded-full bg-danger-bg px-2.5 text-xs font-medium text-danger"
                    }
                  >
                    {user.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted">
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setFormModal({ mode: "edit", user })}>
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setResetTarget(user)}>
                      Reset Password
                    </Button>
                    <Button
                      variant={user.isActive ? "danger" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleStatus(user)}
                    >
                      {user.isActive ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!formModal}
        onClose={() => setFormModal(null)}
        title={formModal?.mode === "edit" ? "Edit User" : "Add User"}
      >
        {formModal && (
          <UserForm
            mode={formModal.mode}
            user={formModal.mode === "edit" ? formModal.user : undefined}
            onCancel={() => setFormModal(null)}
            onSubmit={(values) =>
              formModal.mode === "create"
                ? handleCreate(values)
                : handleUpdate(formModal.user, values as { name: string; role: "ADMIN" | "STAFF"; pin?: string })
            }
          />
        )}
      </Modal>

      <ResetPasswordModal
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        onSubmit={handleResetPassword}
      />
    </div>
  );
}
