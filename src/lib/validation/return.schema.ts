import { z } from "zod";

const simpleLine = z.object({
  saleKind: z.literal("SIMPLE"),
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0),
});

const lengthFullLine = z.object({
  saleKind: z.literal("LENGTH_FULL"),
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0),
});

const lengthCutLine = z.object({
  saleKind: z.literal("LENGTH_CUT"),
  productId: z.string().min(1),
  cutLength: z.coerce.number().positive("Must be greater than 0"),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0),
});

const boxFullLine = z.object({
  saleKind: z.literal("BOX_FULL"),
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0),
});

const boxLooseLine = z.object({
  saleKind: z.literal("BOX_LOOSE"),
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0),
});

const customLine = z.object({
  saleKind: z.literal("CUSTOM"),
  customItemName: z.string().trim().min(1, "Name is required"),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0),
});

export const returnLineSchema = z.discriminatedUnion("saleKind", [
  simpleLine,
  lengthFullLine,
  lengthCutLine,
  boxFullLine,
  boxLooseLine,
  customLine,
]);

export type ReturnLineValues = z.infer<typeof returnLineSchema>;

export const returnSchema = z.object({
  billId: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  creditAccountId: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  customerName: z.string().trim().min(1, "Customer name is required"),
  refundMethod: z.enum(["CASH", "UPI", "CARD", "STORE_CREDIT", "ACCOUNT_CREDIT"]),
  reason: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  createdBy: z.string().trim().optional(),
  lines: z.array(returnLineSchema).min(1, "Add at least one item"),
});

export type ReturnFormValues = z.infer<typeof returnSchema>;
