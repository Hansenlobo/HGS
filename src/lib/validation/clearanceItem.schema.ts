import { z } from "zod";

export const clearanceStatusEnum = z.enum(["AVAILABLE", "SOLD"]);

export const clearanceItemSchema = z.object({
  itemName: z.string().trim().min(1, "Item name is required"),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  originalPrice: z.coerce.number().min(0).optional(),
  discountedPrice: z.coerce.number().min(0, "Discounted price is required"),
  quantityAvailable: z.coerce.number().int().min(0).optional(),
  photoUrl: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  status: clearanceStatusEnum.default("AVAILABLE"),
  addedBy: z.string().trim().optional(),
});

export type ClearanceItemFormValues = z.infer<typeof clearanceItemSchema>;

// PATCH accepts a partial payload so the row-level "Mark as Sold" action can
// send just { status: "SOLD" } without resubmitting the whole form.
export const clearanceItemUpdateSchema = clearanceItemSchema.partial();

export type ClearanceItemUpdateValues = z.infer<typeof clearanceItemUpdateSchema>;
