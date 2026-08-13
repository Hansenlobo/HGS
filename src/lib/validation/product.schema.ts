import { z } from "zod";

const saleTypeEnum = z.enum(["SIMPLE", "LENGTH", "BOX"]);

/**
 * Flat schema used to drive the React Hook Form instance. All sale-type
 * specific fields are optional here so a single form/register set works
 * across the sale-type switch; strict per-sale-type requirements are
 * enforced separately by `productSchema` (the discriminated union) at
 * submit time.
 */
export const productFormInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  notes: z.string().trim().optional(),
  imageUrl: z.string().optional(),
  minStock: z.coerce.number().min(0, "Must be 0 or greater"),
  shelfLocation: z.string().trim().optional(),
  isActive: z.boolean(),
  isPartyProduct: z.boolean(),
  categoryIds: z.array(z.string()),
  saleType: saleTypeEnum,

  costPrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  currentStock: z.coerce.number().optional(),

  fullLengthValue: z.coerce.number().optional(),
  unitLabel: z.string().trim().optional(),
  fullLengthCostPrice: z.coerce.number().optional(),
  fullLengthPrice: z.coerce.number().optional(),
  cutUnitCostPrice: z.coerce.number().optional(),
  cutUnitPrice: z.coerce.number().optional(),
  fullLengthCount: z.coerce.number().optional(),

  boxSize: z.coerce.number().optional(),
  boxCostPrice: z.coerce.number().optional(),
  boxPrice: z.coerce.number().optional(),
  looseUnitCostPrice: z.coerce.number().optional(),
  looseUnitPrice: z.coerce.number().optional(),
  boxCount: z.coerce.number().optional(),
  looseCount: z.coerce.number().optional(),
});

export type ProductFormInput = z.infer<typeof productFormInputSchema>;

const baseProductFields = {
  name: z.string().trim().min(1, "Name is required"),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  imageUrl: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  minStock: z.coerce.number().min(0, "Must be 0 or greater"),
  shelfLocation: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  isActive: z.boolean().default(true),
  isPartyProduct: z.boolean().default(false),
  categoryIds: z.array(z.string()).default([]),
};

const simpleProductSchema = z.object({
  ...baseProductFields,
  saleType: z.literal("SIMPLE"),
  costPrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0, "Selling price is required"),
  currentStock: z.coerce.number().int().min(0),
});

const lengthProductSchema = z.object({
  ...baseProductFields,
  saleType: z.literal("LENGTH"),
  fullLengthValue: z.coerce.number().positive("Must be greater than 0"),
  unitLabel: z.string().trim().min(1, "Unit is required (e.g. ft, m)"),
  fullLengthCostPrice: z.coerce.number().min(0).optional(),
  fullLengthPrice: z.coerce.number().min(0, "Full-length price is required"),
  cutUnitCostPrice: z.coerce.number().min(0).optional(),
  cutUnitPrice: z.coerce.number().min(0, "Cut-piece price is required"),
  fullLengthCount: z.coerce.number().int().min(0),
});

const boxProductSchema = z.object({
  ...baseProductFields,
  saleType: z.literal("BOX"),
  boxSize: z.coerce.number().int().positive("Must be greater than 0"),
  boxCostPrice: z.coerce.number().min(0).optional(),
  boxPrice: z.coerce.number().min(0, "Box price is required"),
  looseUnitCostPrice: z.coerce.number().min(0).optional(),
  looseUnitPrice: z.coerce.number().min(0, "Loose-unit price is required"),
  boxCount: z.coerce.number().int().min(0),
  looseCount: z.coerce.number().int().min(0),
});

/** Strict, discriminated-on-saleType schema used to validate the form's
 * output before it is sent to the API. */
export const productSchema = z.discriminatedUnion("saleType", [
  simpleProductSchema,
  lengthProductSchema,
  boxProductSchema,
]);

export type ProductFormValues = z.infer<typeof productSchema>;
