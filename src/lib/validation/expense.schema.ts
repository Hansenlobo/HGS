import { z } from "zod";

export const expenseCategoryEnum = z.enum([
  "RENT",
  "SALARY",
  "ELECTRICITY",
  "SUPPLIER",
  "TRANSPORT",
  "MISCELLANEOUS",
]);

export const expenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  category: expenseCategoryEnum,
  amount: z.coerce.number().positive("Must be greater than 0"),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  createdBy: z.string().trim().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
