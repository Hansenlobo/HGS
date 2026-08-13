import { z } from "zod";

export const orderItemSchema = z
  .object({
    productId: z.string().optional(),
    customItemName: z.string().trim().optional(),
    saleKind: z.enum(["SIMPLE", "LENGTH_FULL", "LENGTH_CUT", "BOX_FULL", "BOX_LOOSE", "CUSTOM"]).optional(),
    quantity: z.coerce.number().positive("Must be greater than 0"),
    cutLength: z.coerce.number().positive().optional(),
    unit: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
  })
  .refine((data) => !!data.productId || !!data.customItemName, {
    message: "Select a product or enter a custom item name",
    path: ["customItemName"],
  })
  .refine((data) => data.saleKind !== "LENGTH_CUT" || data.cutLength != null, {
    message: "Enter the length to cut",
    path: ["cutLength"],
  });

export const orderSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required"),
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
  createdBy: z.string().trim().optional(),
  items: z.array(orderItemSchema).min(1, "Add at least one item"),
});

export type OrderFormValues = z.infer<typeof orderSchema>;
