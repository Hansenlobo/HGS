export const expenseCategories = [
  "RENT",
  "SALARY",
  "ELECTRICITY",
  "SUPPLIER",
  "TRANSPORT",
  "MISCELLANEOUS",
] as const;

export type ExpenseCategoryValue = (typeof expenseCategories)[number];

const labels: Record<ExpenseCategoryValue, string> = {
  RENT: "Rent",
  SALARY: "Salary",
  ELECTRICITY: "Electricity",
  SUPPLIER: "Supplier",
  TRANSPORT: "Transport",
  MISCELLANEOUS: "Miscellaneous",
};

export function formatExpenseCategory(category: ExpenseCategoryValue): string {
  return labels[category];
}
