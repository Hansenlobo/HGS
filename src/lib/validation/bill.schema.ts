import { z } from "zod";

export const discountTypeEnum = z.enum(["FLAT", "PERCENT"]);

const baseLineFields = {
  discountType: discountTypeEnum.optional(),
  discountValue: z.coerce.number().min(0).optional(),
  note: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
};

const simpleLine = z.object({
  ...baseLineFields,
  saleKind: z.literal("SIMPLE"),
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0),
});

const lengthFullLine = z.object({
  ...baseLineFields,
  saleKind: z.literal("LENGTH_FULL"),
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0),
});

const lengthCutLine = z.object({
  ...baseLineFields,
  saleKind: z.literal("LENGTH_CUT"),
  productId: z.string().min(1),
  cutLength: z.coerce.number().positive("Must be greater than 0"),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0),
});

const boxFullLine = z.object({
  ...baseLineFields,
  saleKind: z.literal("BOX_FULL"),
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0),
});

const boxLooseLine = z.object({
  ...baseLineFields,
  saleKind: z.literal("BOX_LOOSE"),
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0),
});

const customLine = z.object({
  ...baseLineFields,
  saleKind: z.literal("CUSTOM"),
  customItemName: z.string().trim().min(1, "Name is required"),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0),
  // Custom items have no product to carry an isPartyProduct flag, so on a
  // Party bill this opts a specific line into the party markup instead.
  applyMarkup: z.boolean().optional().default(false),
});

export const billLineSchema = z.discriminatedUnion("saleKind", [
  simpleLine,
  lengthFullLine,
  lengthCutLine,
  boxFullLine,
  boxLooseLine,
  customLine,
]);

export type BillLineValues = z.infer<typeof billLineSchema>;

export const billSchema = z
  .object({
    type: z.enum(["NORMAL", "PARTY"]),
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
    partyPercentage: z.coerce.number().min(0).max(100).optional(),
    overallDiscountType: discountTypeEnum.optional(),
    overallDiscountValue: z.coerce.number().min(0).optional(),
    sourceOrderId: z.string().optional(),
    sourceQuotationId: z.string().optional(),
    createdBy: z.string().trim().optional(),
    lines: z.array(billLineSchema).min(1, "Add at least one item"),
  })
  .refine((data) => data.type !== "PARTY" || data.partyPercentage != null, {
    message: "Party Percentage is required for Party bills",
    path: ["partyPercentage"],
  });

export type BillFormValues = z.infer<typeof billSchema>;

export const billEditSchema = z.object({
  pin: z.string().min(1, "PIN is required"),
  editedBy: z.string().trim().optional(),
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
});

export type BillEditValues = z.infer<typeof billEditSchema>;

export const billCancelSchema = z.object({
  pin: z.string().min(1, "PIN is required"),
  cancelledBy: z.string().trim().optional(),
  reason: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type BillCancelValues = z.infer<typeof billCancelSchema>;
