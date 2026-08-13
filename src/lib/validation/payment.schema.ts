import { z } from "zod";

export const paymentMethodEnum = z.enum(["CASH", "UPI", "CARD", "OTHER"]);

export const addPaymentSchema = z.object({
  amount: z.coerce.number().positive("Must be greater than 0"),
  method: paymentMethodEnum.default("CASH"),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  enteredBy: z.string().trim().optional(),
});

export type AddPaymentValues = z.infer<typeof addPaymentSchema>;

export const editPaymentSchema = z.object({
  pin: z.string().min(1, "PIN is required"),
  amount: z.coerce.number().positive("Must be greater than 0"),
  method: paymentMethodEnum.default("CASH"),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type EditPaymentValues = z.infer<typeof editPaymentSchema>;

export const deletePaymentSchema = z.object({
  pin: z.string().min(1, "PIN is required"),
});

export type DeletePaymentValues = z.infer<typeof deletePaymentSchema>;

export const markPaidSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount"),
});

export type MarkPaidValues = z.infer<typeof markPaidSchema>;
