import { z } from "zod";

const reasonField = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const adjustmentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("SIMPLE"),
    quantity: z.coerce.number().positive("Must be greater than 0"),
    reason: reasonField,
  }),
  z.object({
    kind: z.literal("LENGTH_FULL"),
    quantity: z.coerce.number().int().positive("Must be greater than 0"),
    reason: reasonField,
  }),
  z.object({
    kind: z.literal("LENGTH_CUT"),
    length: z.coerce.number().positive("Must be greater than 0"),
    quantity: z.coerce.number().int().positive("Must be greater than 0"),
    reason: reasonField,
  }),
  z.object({
    kind: z.literal("LENGTH_MANUAL_CUT"),
    length: z.coerce.number().positive("Must be greater than 0"),
    quantity: z.coerce.number().int().positive("Must be greater than 0"),
    reason: reasonField,
  }),
  z.object({
    kind: z.literal("BOX_FULL"),
    quantity: z.coerce.number().int().positive("Must be greater than 0"),
    reason: reasonField,
  }),
  z.object({
    kind: z.literal("BOX_LOOSE"),
    quantity: z.coerce.number().int().positive("Must be greater than 0"),
    reason: reasonField,
  }),
]);

export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;
