"use client";

import { createContext, useContext, type ReactNode } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

/** Safe subset of AppSettings for client consumption — never includes
 * adminPin or backup internals, so it's fine to hand to every logged-in
 * user regardless of role. */
export interface PublicAppSettings {
  storeName: string | null;
  storeAddress: string | null;
  storePhone: string | null;
  gstNumber: string | null;
  upiId: string | null;
  invoicePrefix: string;
  showQrOnBill: boolean;
  showDiscountOnBill: boolean;
  enableCreditAccounts: boolean;
  printFormat: "THERMAL_3IN" | "THERMAL_4IN";
}

export const PUBLIC_SETTINGS_KEY = "/api/public-settings";

const InitialSettingsContext = createContext<PublicAppSettings | null>(null);

/** Seeds the initial (server-rendered) value only — the actual live value
 * every component reads comes from the shared SWR cache below, so a
 * Settings-page save (which revalidates that cache key) is reflected
 * instantly everywhere, even on pages/layouts that already rendered
 * before the change and never re-run their server-side data fetch on
 * client-side navigation. */
export function AppSettingsProvider({
  settings,
  children,
}: {
  settings: PublicAppSettings;
  children: ReactNode;
}) {
  return <InitialSettingsContext.Provider value={settings}>{children}</InitialSettingsContext.Provider>;
}

export function useAppSettings(): PublicAppSettings {
  const initial = useContext(InitialSettingsContext);
  if (!initial) throw new Error("useAppSettings must be used within AppSettingsProvider");
  const { data } = useSWR<PublicAppSettings>(PUBLIC_SETTINGS_KEY, fetcher, { fallbackData: initial });
  return data ?? initial;
}
