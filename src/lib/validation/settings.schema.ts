import { z } from "zod";

function optionalText() {
  return z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined));
}

export const settingsSchema = z.object({
  storeName: optionalText(),
  storeAddress: optionalText(),
  storePhone: optionalText(),
  gstNumber: optionalText(),
  logoUrl: optionalText(),
  upiId: optionalText(),

  adminPin: optionalText(),
  minPasswordLength: z.coerce.number().int().min(4).max(32),

  printFormat: z.enum(["THERMAL_3IN", "THERMAL_4IN"]),
  showQrOnBill: z.boolean(),
  showDiscountOnBill: z.boolean(),

  enableCreditAccounts: z.boolean(),
  enablePartyBilling: z.boolean(),
  timezone: z.string().trim().min(1),
  currency: z.string().trim().min(1),

  invoicePrefix: z.string().trim().min(1),

  backupPath: optionalText(),
  backupFrequency: z.enum(["DAILY", "WEEKLY", "EVERY_N_TRANSACTIONS"]),
  backupEveryNTransactions: z.coerce.number().int().positive().optional(),
  backupTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM")
    .optional(),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;
