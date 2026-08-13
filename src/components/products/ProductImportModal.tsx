"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { buildProductImportTemplate } from "@/lib/products/importCsv";
import { postJson } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; name: string; message: string }[];
}

export interface ProductImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function ProductImportModal({ open, onClose, onImported }: ProductImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | undefined>();

  function downloadTemplate() {
    downloadCsv("product-import-template.csv", buildProductImportTemplate());
  }

  async function handleFile(file: File) {
    setError(undefined);
    setResult(null);
    setUploading(true);
    try {
      const csv = await file.text();
      const res = await postJson<ImportResult>("/api/products/import", { csv });
      setResult(res);
      if (res.created + res.updated > 0) onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleClose() {
    setResult(null);
    setError(undefined);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import Products">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Upload a CSV of products (from Excel: File → Save As → CSV). Existing products are matched and
          updated by exact name; new names are created.
        </p>

        <Button type="button" variant="secondary" onClick={downloadTemplate}>
          <Download size={16} /> Download CSV Template
        </Button>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted hover:bg-black/5 dark:hover:bg-white/5">
          <Upload size={20} />
          {uploading ? "Uploading…" : "Click to choose a CSV file"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        {result && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-sm">
            <p className="text-foreground">
              {result.created} created, {result.updated} updated, {result.errors.length} failed.
            </p>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-danger">
                    Row {e.row} ({e.name || "unnamed"}): {e.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
