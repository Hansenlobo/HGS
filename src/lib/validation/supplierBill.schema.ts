import { z } from "zod";

export const supplierBillSchema = z.object({
  amount: z.coerce.number().positive("Must be greater than 0"),
  reference: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  date: z.string().trim().optional(),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  createdBy: z.string().trim().optional(),
});

export type SupplierBillValues = z.infer<typeof supplierBillSchema>;
