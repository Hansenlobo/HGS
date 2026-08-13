"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import clsx from "clsx";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "wide" for content with its own horizontal-scrolling table (item
   * pickers etc.) that needs more room than the default form-modal width
   * gives it. */
  size?: "default" | "wide";
}

export function Modal({ open, onClose, title, children, footer, size = "default" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Safe without a mount-detection gate: every Modal in this app is
  // opened via client-side state that starts false, so `open` (and thus
  // this component's only access to `document`) is never true during
  // SSR or the initial hydration pass — only after a later user click.
  if (!open) return null;

  // Portalled to <body> — a Modal can be triggered from deep inside a
  // table row (BillItemRow's notes popup, etc.), and its "fixed inset-0"
  // overlay must never end up nested somewhere HTML forbids a <div>
  // (inside a <tbody>, for instance), which throws a hydration error.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className={clsx(
          "relative flex h-[100dvh] w-full flex-col bg-surface sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-xl sm:border sm:border-border",
          size === "wide" ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-border px-4 py-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
