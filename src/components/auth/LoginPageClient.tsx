"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/fetcher";

export interface LoginPageClientProps {
  needsSetup: boolean;
  storeName: string;
}

export function LoginPageClient({ needsSetup, storeName }: LoginPageClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      if (needsSetup) {
        await postJson("/api/auth/bootstrap", { name, username, password });
      }
      await postJson("/api/auth/login", { username, password });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClasses =
    "w-full rounded-[3px] border border-border bg-[#fbfaf8] px-3 py-2.5 text-[15px] text-foreground outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10";

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <form onSubmit={handleSubmit} noValidate className="relative w-full max-w-sm rounded border border-border bg-surface px-9 pt-10 pb-8 shadow-sm">
        <div className="absolute -top-px left-6 h-1.5 w-10 bg-accent" />

        <div className="mb-3.5 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          Secure terminal
        </div>

        <h1 className="m-0 font-display text-[26px] font-semibold tracking-tight text-foreground">{storeName}</h1>
        <p className="mt-1.5 mb-7 text-sm text-muted">
          {needsSetup ? "Create the first Admin account to get started." : "Sign in to access orders, billing and inventory."}
        </p>

        {error && (
          <div className="mb-4.5 rounded-[3px] border border-danger/30 bg-danger-bg px-3 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        {needsSetup && (
          <div className="mb-4.5">
            <label htmlFor="name" className="mb-1.5 block font-mono text-[11px] tracking-wide text-muted uppercase">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClasses}
              required
            />
          </div>
        )}

        <div className="mb-4.5">
          <label htmlFor="username" className="mb-1.5 block font-mono text-[11px] tracking-wide text-muted uppercase">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClasses}
            required
          />
        </div>

        <div className="mb-5.5">
          <label htmlFor="password" className="mb-1.5 block font-mono text-[11px] tracking-wide text-muted uppercase">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={needsSetup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClasses}
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-[3px] bg-primary px-4 py-3 text-sm font-semibold tracking-wide text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "…" : needsSetup ? "Create Admin Account" : "Sign In"}
        </button>

        <div className="mt-6 border-t border-border pt-4 font-mono text-[11px] text-muted/70">
          {storeName}
        </div>
      </form>
    </div>
  );
}
