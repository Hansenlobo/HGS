import { prisma } from "@/lib/prisma";

/** Every table except User and AppSettings — clearing business data
 * without touching logins or store configuration. Order doesn't matter
 * since foreign key checks are disabled for the duration of the wipe. */
const BUSINESS_DATA_TABLES = [
  "StockAdjustment",
  "CutPieceStock",
  "ProductPriceHistory",
  "ProductCategory",
  "OrderPrintLog",
  "OrderItem",
  "TemporaryOrder",
  "QuotationPrintLog",
  "QuotationLineItem",
  "Quotation",
  "BillPrintLog",
  "BillAuditLog",
  "Payment",
  "BillLineItem",
  "Bill",
  "CustomItem",
  "ProductSupplier",
  "SupplierBill",
  "SupplierPayment",
  "Supplier",
  "Expense",
  "AuditLog",
  "ReturnLineItem",
  "ReturnTransaction",
  "CreditAccountPayment",
  "CreditAccountItem",
  "CreditAccount",
  "ClearanceItem",
  "Product",
  "Category",
  "SequenceCounter",
];

/** Wipes every business-data table (products, bills, orders, credit
 * accounts, suppliers, expenses, stock/audit history, etc.) but leaves
 * the User table and the AppSettings singleton untouched, so admins stay
 * logged in and store configuration survives the reset. */
export async function clearBusinessData(): Promise<void> {
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys=OFF");
  try {
    for (const table of BUSINESS_DATA_TABLES) {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
    }
  } finally {
    await prisma.$executeRawUnsafe("PRAGMA foreign_keys=ON");
  }
  // No VACUUM: Turso rejects it outright ("SQL not allowed statement"),
  // and reclaiming local file space is meaningless for a hosted database
  // anyway — it only made sense back when this ran against dev.db directly.
}
