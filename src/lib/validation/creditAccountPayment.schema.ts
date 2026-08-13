import { z } from "zod";

export const creditAccountPaymentSchema = z.object({
  amount: z.coerce.number().positive("Must be greater than 0"),
  method: z.enum(["CASH", "UPI", "CARD", "OTHER"]).default("CASH"),
  date: z.string().trim().optional(),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  enteredBy: z.string().trim().optional(),
});

export type CreditAccountPaymentValues = z.infer<typeof creditAccountPaymentSchema>;
