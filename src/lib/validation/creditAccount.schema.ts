import { z } from "zod";

export const creditAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  customerName: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  customerPhone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  percentageIncrease: z.coerce.number().min(0).max(500),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  createdBy: z.string().trim().optional(),
});

export type CreditAccountFormValues = z.infer<typeof creditAccountSchema>;

const discountTypeEnum = z.enum(["FLAT", "PERCENT"]);
const discountFields = {
  discountType: discountTypeEnum.optional(),
  discountValue: z.coerce.number().min(0).optional(),
};
const rateFields = {
  rate: z.coerce.number().min(0).optional(),
  rateLocked: z.boolean().optional().default(false),
};

const simpleLine = z.object({
  saleKind: z.literal("SIMPLE"),
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  notes: z.string().trim().optional(),
  ...rateFields,
  ...discountFields,
});

const lengthFullLine = z.object({
  saleKind: z.literal("LENGTH_FULL"),
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  notes: z.string().trim().optional(),
  ...rateFields,
  ...discountFields,
});

const lengthCutLine = z.object({
  saleKind: z.literal("LENGTH_CUT"),
  productId: z.string().min(1),
  cutLength: z.coerce.number().positive("Must be greater than 0"),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  notes: z.string().trim().optional(),
  ...rateFields,
  ...discountFields,
});

const boxFullLine = z.object({
  saleKind: z.literal("BOX_FULL"),
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  notes: z.string().trim().optional(),
  ...rateFields,
  ...discountFields,
});

const boxLooseLine = z.object({
  saleKind: z.literal("BOX_LOOSE"),
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  notes: z.string().trim().optional(),
  ...rateFields,
  ...discountFields,
});

const customLine = z.object({
  saleKind: z.literal("CUSTOM"),
  customItemName: z.string().trim().min(1, "Name is required"),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0, "Rate is required for custom items"),
  notes: z.string().trim().optional(),
  // Custom items have no product to carry an isPartyProduct flag, so
  // whether the account's percentage increase applies is opt-in per item.
  applyMarkup: z.boolean().optional().default(false),
  ...discountFields,
});

export const creditAccountItemLineSchema = z.discriminatedUnion("saleKind", [
  simpleLine,
  lengthFullLine,
  lengthCutLine,
  boxFullLine,
  boxLooseLine,
  customLine,
]);

export type CreditAccountItemLineValues = z.infer<typeof creditAccountItemLineSchema>;

export const creditAccountAddItemsSchema = z.object({
  lines: z.array(creditAccountItemLineSchema).min(1, "Add at least one item"),
  createdBy: z.string().trim().optional(),
});

export type CreditAccountAddItemsValues = z.infer<typeof creditAccountAddItemsSchema>;

export const creditAccountEditItemSchema = z.object({
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0).optional(),
  rateLocked: z.boolean().optional(),
  applyMarkup: z.boolean().optional(),
  discountType: discountTypeEnum.optional(),
  discountValue: z.coerce.number().min(0).optional(),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type CreditAccountEditItemValues = z.infer<typeof creditAccountEditItemSchema>;
