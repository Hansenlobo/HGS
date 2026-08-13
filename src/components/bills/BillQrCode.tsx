"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export interface BillQrCodeProps {
  upiId: string;
  storeName: string;
  amount: number;
  billLabel: string;
}

export function BillQrCode({ upiId, storeName, amount, billLabel }: BillQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const payload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(billLabel)}`;
    let cancelled = false;
    QRCode.toDataURL(payload, { margin: 1, width: 160 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [upiId, storeName, amount, billLabel]);

  if (!dataUrl) return null;

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="Scan to pay via UPI" width={140} height={140} />
      <p className="text-xs text-muted">Scan to pay {upiId}</p>
    </div>
  );
}
