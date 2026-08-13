import { z } from "zod";
import { billLineSchema, discountTypeEnum } from "./bill.schema";

export const quotationSchema = z.object({
  customerName: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : "Walk-in")),
  customerPhone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  customerNotes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  partyPercentage: z.coerce.number().min(0).max(100).default(0),
  overallDiscountType: discountTypeEnum.optional(),
  overallDiscountValue: z.coerce.number().min(0).optional(),
  createdBy: z.string().trim().optional(),
  lines: z.array(billLineSchema).min(1, "Add at least one item"),
});

export type QuotationFormValues = z.infer<typeof quotationSchema>;
