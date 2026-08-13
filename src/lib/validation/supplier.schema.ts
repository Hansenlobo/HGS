import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  address: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  gstNumber: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  outstandingBalance: z.coerce.number().default(0),
  productIds: z.array(z.string()).default([]),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
