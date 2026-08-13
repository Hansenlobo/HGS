import { z } from "zod";

const reasonField = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

const costPriceField = z.coerce
  .number()
  .min(0)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v));

const newSellingPriceField = z.coerce
  .number()
  .min(0)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v));

const supplierIdField = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const receiveStockSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("SIMPLE"),
    quantity: z.coerce.number().positive("Must be greater than 0"),
    costPrice: costPriceField,
    newSellingPrice: newSellingPriceField,
    supplierId: supplierIdField,
    reason: reasonField,
  }),
  z.object({
    kind: z.literal("LENGTH_FULL"),
    quantity: z.coerce.number().int().positive("Must be greater than 0"),
    costPrice: costPriceField,
    newSellingPrice: newSellingPriceField,
    supplierId: supplierIdField,
    reason: reasonField,
  }),
  z.object({
    kind: z.literal("BOX_FULL"),
    quantity: z.coerce.number().int().positive("Must be greater than 0"),
    costPrice: costPriceField,
    newSellingPrice: newSellingPriceField,
    supplierId: supplierIdField,
    reason: reasonField,
  }),
]);

export type ReceiveStockFormValues = z.infer<typeof receiveStockSchema>;
