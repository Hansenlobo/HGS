"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { readImageAsDataUrl } from "@/lib/image";
import { ImageLightbox } from "@/components/ui/ImageLightbox";

export interface ProductPhotoFieldProps {
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function ProductPhotoField({ value, onChange }: ProductPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(undefined);
    setLoading(true);
    try {
      const dataUrl = await readImageAsDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load image");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">Photo (optional)</span>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              aria-label="Expand photo"
              onClick={() => setExpanded(true)}
              className="block h-full w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Product" className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange("")}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted hover:bg-black/5 dark:hover:bg-white/5"
          >
            <ImagePlus size={20} />
            <span className="text-xs">{loading ? "Loading…" : "Upload"}</span>
          </button>
        )}
        {value && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="text-sm font-medium text-primary hover:underline"
          >
            {loading ? "Loading…" : "Replace photo"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <span className="text-xs text-danger">{error}</span>}

      <ImageLightbox
        src={expanded ? (value ?? null) : null}
        alt="Product"
        onClose={() => setExpanded(false)}
      />
    </div>
  );
}
