"use client";

import { useState } from "react";
import { mutate as globalMutate } from "swr";
import type { AppSettingsModel } from "@/types";
import { patchJson, postJson } from "@/lib/fetcher";
import { PUBLIC_SETTINGS_KEY } from "@/components/settings/AppSettingsProvider";
import { formatDateTime } from "@/lib/formatDate";
import { useToast } from "@/components/ui/Toast";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DangerZoneSection } from "./DangerZoneSection";

export interface SettingsPageClientProps {
  initialSettings: AppSettingsModel;
}

type FormState = {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  gstNumber: string;
  logoUrl: string;
  upiId: string;
  adminPin: string;
  minPasswordLength: string;
  printFormat: "THERMAL_3IN" | "THERMAL_4IN";
  showQrOnBill: boolean;
  showDiscountOnBill: boolean;
  enableCreditAccounts: boolean;
  enablePartyBilling: boolean;
  timezone: string;
  currency: string;
  invoicePrefix: string;
  backupPath: string;
  backupFrequency: "DAILY" | "WEEKLY" | "EVERY_N_TRANSACTIONS";
  backupEveryNTransactions: string;
  backupTime: string;
};

function toFormState(s: AppSettingsModel): FormState {
  return {
    storeName: s.storeName ?? "",
    storeAddress: s.storeAddress ?? "",
    storePhone: s.storePhone ?? "",
    gstNumber: s.gstNumber ?? "",
    logoUrl: s.logoUrl ?? "",
    upiId: s.upiId ?? "",
    adminPin: s.adminPin ?? "",
    minPasswordLength: String(s.minPasswordLength),
    printFormat: s.printFormat,
    showQrOnBill: s.showQrOnBill,
    showDiscountOnBill: s.showDiscountOnBill,
    enableCreditAccounts: s.enableCreditAccounts,
    enablePartyBilling: s.enablePartyBilling,
    timezone: s.timezone,
    currency: s.currency,
    invoicePrefix: s.invoicePrefix,
    backupPath: s.backupPath ?? "",
    backupFrequency: s.backupFrequency,
    backupEveryNTransactions: s.backupEveryNTransactions != null ? String(s.backupEveryNTransactions) : "",
    backupTime: s.backupTime ?? "02:00",
  };
}

export function SettingsPageClient({ initialSettings }: SettingsPageClientProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(toFormState(initialSettings));
  const [lastBackupAt, setLastBackupAt] = useState(initialSettings.lastBackupAt);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setError(undefined);
    setSaving(true);
    try {
      const updated = await patchJson<AppSettingsModel>("/api/settings", {
        ...form,
        minPasswordLength: Number(form.minPasswordLength) || 6,
        backupEveryNTransactions:
          form.backupFrequency === "EVERY_N_TRANSACTIONS" && form.backupEveryNTransactions
            ? Number(form.backupEveryNTransactions)
            : undefined,
      });
      setForm(toFormState(updated));
      await globalMutate(PUBLIC_SETTINGS_KEY);
      showToast("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleBackupNow() {
    setError(undefined);
    setBackingUp(true);
    try {
      await postJson<{ filePath: string; fileName: string }>("/api/settings/backup", {});
      setLastBackupAt(new Date());
      showToast("Backup complete");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Backup failed", "error");
    } finally {
      setBackingUp(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted">Store info, security, printing, and business configuration.</p>
      </div>

      <SectionCard title="Store Info">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Store Name"
            value={form.storeName}
            onChange={(e) => set("storeName", e.target.value)}
            hint="Also shown as the app name in the sidebar, browser tab, and login screen."
          />
          <Input label="Phone" value={form.storePhone} onChange={(e) => set("storePhone", e.target.value)} />
        </div>
        <Textarea label="Address" rows={2} value={form.storeAddress} onChange={(e) => set("storeAddress", e.target.value)} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="GST Number" value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} />
          <Input label="UPI ID (for bill QR code)" value={form.upiId} onChange={(e) => set("upiId", e.target.value)} />
        </div>
        <Input label="Logo URL" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={form.showQrOnBill}
            onChange={(e) => set("showQrOnBill", e.target.checked)}
          />
          <span className="text-sm font-medium text-foreground">Show UPI QR code on printed bills</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={form.showDiscountOnBill}
            onChange={(e) => set("showDiscountOnBill", e.target.checked)}
          />
          <span className="text-sm font-medium text-foreground">Show discount amount on printed bills</span>
        </label>
      </SectionCard>

      <SectionCard title="Security">
        <Input
          label="Admin PIN"
          placeholder="Used for cancel bill, edit/delete payment, deactivate product"
          value={form.adminPin}
          onChange={(e) => set("adminPin", e.target.value)}
        />
        <Input
          label="Minimum Password Length"
          type="number"
          value={form.minPasswordLength}
          onChange={(e) => set("minPasswordLength", e.target.value)}
        />
      </SectionCard>

      <SectionCard title="Printing">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Print Format</span>
          <div className="flex flex-wrap gap-2">
            <Chip active={form.printFormat === "THERMAL_3IN"} onClick={() => set("printFormat", "THERMAL_3IN")}>
              Thermal 3&quot;
            </Chip>
            <Chip active={form.printFormat === "THERMAL_4IN"} onClick={() => set("printFormat", "THERMAL_4IN")}>
              Thermal 4&quot;
            </Chip>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Business Settings">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={form.enableCreditAccounts}
            onChange={(e) => set("enableCreditAccounts", e.target.checked)}
          />
          <span className="text-sm font-medium text-foreground">Enable Credit Accounts (unpaid/partial bills)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={form.enablePartyBilling}
            onChange={(e) => set("enablePartyBilling", e.target.checked)}
          />
          <span className="text-sm font-medium text-foreground">Enable Party Billing</span>
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Timezone" value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
          <Input label="Currency Code" value={form.currency} onChange={(e) => set("currency", e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard title="Invoice Numbering">
        <Input
          label="Invoice Prefix"
          value={form.invoicePrefix}
          onChange={(e) => set("invoicePrefix", e.target.value)}
        />
      </SectionCard>

      <SectionCard title="Backup">
        <Input
          label="Backup Path"
          placeholder="e.g. C:\HGS-Backups or /home/user/hgs-backups"
          value={form.backupPath}
          onChange={(e) => set("backupPath", e.target.value)}
          hint="A folder on the machine running this app — type the full path. Browsers can't open a native folder picker for a server-side location."
        />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Backup Frequency</span>
          <div className="flex flex-wrap gap-2">
            <Chip active={form.backupFrequency === "DAILY"} onClick={() => set("backupFrequency", "DAILY")}>
              Daily
            </Chip>
            <Chip active={form.backupFrequency === "WEEKLY"} onClick={() => set("backupFrequency", "WEEKLY")}>
              Weekly
            </Chip>
            <Chip
              active={form.backupFrequency === "EVERY_N_TRANSACTIONS"}
              onClick={() => set("backupFrequency", "EVERY_N_TRANSACTIONS")}
            >
              Every N Transactions
            </Chip>
          </div>
        </div>
        {(form.backupFrequency === "DAILY" || form.backupFrequency === "WEEKLY") && (
          <Input
            label="Backup Time"
            type="time"
            value={form.backupTime}
            onChange={(e) => set("backupTime", e.target.value)}
            hint={form.backupFrequency === "WEEKLY" ? "Runs weekly, on or after this time." : "Runs daily, on or after this time."}
          />
        )}
        {form.backupFrequency === "EVERY_N_TRANSACTIONS" && (
          <Input
            label="N (transactions)"
            type="number"
            value={form.backupEveryNTransactions}
            onChange={(e) => set("backupEveryNTransactions", e.target.value)}
          />
        )}
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-sm text-muted">
            {lastBackupAt ? `Last backup: ${formatDateTime(lastBackupAt)}` : "No backup has run yet."}
          </p>
          <Button type="button" variant="secondary" size="sm" disabled={backingUp} onClick={handleBackupNow}>
            {backingUp ? "Backing up…" : "Backup Now"}
          </Button>
        </div>
      </SectionCard>

      <DangerZoneSection />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-surface px-4 pr-16 py-3 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:pt-0">
        <Button fullWidth disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}
