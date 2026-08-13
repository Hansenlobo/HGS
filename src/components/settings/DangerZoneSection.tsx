"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PinPrompt } from "@/components/ui/PinPrompt";
import { useToast } from "@/components/ui/Toast";

const CLEAR_PHRASE = "CLEAR DATA";
const REIMPORT_PHRASE = "REPLACE DATA";

export function DangerZoneSection() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-danger/40 bg-danger-bg p-4">
      <div>
        <h2 className="text-sm font-semibold text-danger">Danger Zone</h2>
        <p className="text-sm text-muted">
          Both actions below are immediate and affect the live database. Take a backup first if you&apos;re
          not sure.
        </p>
      </div>
      <ClearDataAction />
      <hr className="border-danger/20" />
      <ReimportDataAction />
    </div>
  );
}

function ClearDataAction() {
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [pinOpen, setPinOpen] = useState(false);

  function reset() {
    setConfirmOpen(false);
    setPhrase("");
    setPinOpen(false);
  }

  async function handlePinConfirm(pin: string) {
    const res = await fetch("/api/settings/clear-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, confirmation: CLEAR_PHRASE }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "Could not clear data");
    }
    showToast("Business data cleared");
    reset();
    // Intentional hard navigation (not router.push) — every page's SWR
    // cache needs to forget the pre-clear data, not just re-render with it.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/dashboard";
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">Clear Business Data</p>
        <p className="text-xs text-muted">
          Wipes products, bills, orders, credit accounts, suppliers, expenses, and history. Your login
          and these settings are kept.
        </p>
      </div>
      <Button type="button" variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
        Clear Data
      </Button>

      <Modal open={confirmOpen} onClose={reset} title="Clear Business Data">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-danger">
            This permanently deletes every product, bill, order, credit account, supplier, expense, and
            audit record. This cannot be undone.
          </p>
          <Input
            label={`Type "${CLEAR_PHRASE}" to confirm`}
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={reset}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              fullWidth
              disabled={phrase !== CLEAR_PHRASE}
              onClick={() => {
                setConfirmOpen(false);
                setPinOpen(true);
              }}
            >
              Continue to PIN
            </Button>
          </div>
        </div>
      </Modal>

      <PinPrompt
        open={pinOpen}
        title="Confirm Clear Data"
        description="Enter the Admin PIN to permanently clear all business data."
        onConfirm={handlePinConfirm}
        onCancel={reset}
      />
    </div>
  );
}

function ReimportDataAction() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  function reset() {
    setConfirmOpen(false);
    setPhrase("");
    setPinOpen(false);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handlePinConfirm(pin: string) {
    if (!file) throw new Error("Choose a .db file first");
    const form = new FormData();
    form.append("file", file);
    form.append("pin", pin);
    form.append("confirmation", REIMPORT_PHRASE);

    const res = await fetch("/api/settings/reimport-db", { method: "POST", body: form });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.error ?? "Could not import database");
    }
    setPinOpen(false);
    setResultMessage(
      `Database replaced. A safety snapshot of the previous database was saved as "${body.safetyBackupFile}" in your backup folder. The imported data is live immediately — no restart needed.`,
    );
    setResultOpen(true);
    showToast("Database file replaced");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">Reimport Database</p>
        <p className="text-xs text-muted">
          Replace the live database with a previously backed-up .db file. Requires restarting the app
          afterward.
        </p>
      </div>
      <Button type="button" variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
        Reimport
      </Button>

      <Modal open={confirmOpen} onClose={reset} title="Reimport Database">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-danger">
            This replaces the entire live database with the file you choose. A safety snapshot of the
            current database is taken automatically first, but everything added since that snapshot on
            the CURRENT database will be gone. A Backup Path must already be set in Settings.
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Database file (.db)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".db"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-foreground"
            />
          </label>
          <Input
            label={`Type "${REIMPORT_PHRASE}" to confirm`}
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={reset}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              fullWidth
              disabled={phrase !== REIMPORT_PHRASE || !file}
              onClick={() => {
                setConfirmOpen(false);
                setPinOpen(true);
              }}
            >
              Continue to PIN
            </Button>
          </div>
        </div>
      </Modal>

      <PinPrompt
        open={pinOpen}
        title="Confirm Reimport"
        description="Enter the Admin PIN to replace the live database."
        onConfirm={handlePinConfirm}
        onCancel={reset}
      />

      <Modal open={resultOpen} onClose={reset} title="Restart Required">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">{resultMessage}</p>
          <Button type="button" fullWidth onClick={reset}>
            Got it
          </Button>
        </div>
      </Modal>
    </div>
  );
}
