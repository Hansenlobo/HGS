import { prisma } from "@/lib/prisma";
import type { AppSettingsModel } from "@/types";
import type { PublicAppSettings } from "@/components/settings/AppSettingsProvider";

/** The settings row is a lazily-created singleton — the first read (or
 * write) creates it with schema defaults, so every caller can assume it
 * exists without a separate seed step. */
export async function getOrCreateAppSettings(): Promise<AppSettingsModel> {
  return prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

/** Strips adminPin and backup/security internals before handing settings
 * to client components — every logged-in user (not just admins) can read
 * this subset. */
export function toPublicSettings(settings: AppSettingsModel): PublicAppSettings {
  return {
    storeName: settings.storeName,
    storeAddress: settings.storeAddress,
    storePhone: settings.storePhone,
    gstNumber: settings.gstNumber,
    upiId: settings.upiId,
    invoicePrefix: settings.invoicePrefix,
    showQrOnBill: settings.showQrOnBill,
    showDiscountOnBill: settings.showDiscountOnBill,
    enableCreditAccounts: settings.enableCreditAccounts,
    printFormat: settings.printFormat,
  };
}
