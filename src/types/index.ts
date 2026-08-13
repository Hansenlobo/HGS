import { Prisma } from "@/generated/prisma/client";

export const productWithRelationsArgs = {
  include: {
    categories: { include: { category: true } },
    cutPieces: true,
    priceHistory: { orderBy: { recordedAt: "desc" }, take: 8 },
  },
} satisfies Prisma.ProductDefaultArgs;

export type ProductWithRelations = Prisma.ProductGetPayload<
  typeof productWithRelationsArgs
>;

export type CategoryModel = Prisma.CategoryGetPayload<Record<string, never>>;

export type StockAdjustmentModel = Prisma.StockAdjustmentGetPayload<
  Record<string, never>
>;

export const orderWithRelationsArgs = {
  include: {
    items: { include: { product: true }, orderBy: { sortOrder: "asc" } },
    printLogs: { orderBy: { printedAt: "desc" } },
    convertedBill: true,
  },
} satisfies Prisma.TemporaryOrderDefaultArgs;

export type OrderWithRelations = Prisma.TemporaryOrderGetPayload<
  typeof orderWithRelationsArgs
>;

export const billWithRelationsArgs = {
  include: {
    lineItems: { include: { product: true, customItem: true }, orderBy: { sortOrder: "asc" } },
    payments: { orderBy: { createdAt: "desc" } },
    printLogs: { orderBy: { printedAt: "desc" } },
    auditLogs: { orderBy: { createdAt: "desc" } },
    sourceOrder: true,
  },
} satisfies Prisma.BillDefaultArgs;

export type BillWithRelations = Prisma.BillGetPayload<typeof billWithRelationsArgs>;

export const billListArgs = {
  include: {
    payments: { where: { isDeleted: false } },
  },
} satisfies Prisma.BillDefaultArgs;

export type BillListItem = Prisma.BillGetPayload<typeof billListArgs>;

export const quotationWithRelationsArgs = {
  include: {
    lineItems: {
      include: { product: { include: productWithRelationsArgs.include }, customItem: true },
      orderBy: { sortOrder: "asc" },
    },
    printLogs: { orderBy: { printedAt: "desc" } },
    convertedBill: true,
  },
} satisfies Prisma.QuotationDefaultArgs;

export type QuotationWithRelations = Prisma.QuotationGetPayload<typeof quotationWithRelationsArgs>;

export type QuotationModel = Prisma.QuotationGetPayload<Record<string, never>>;

export type BillModel = Prisma.BillGetPayload<Record<string, never>>;

export type PaymentModel = Prisma.PaymentGetPayload<Record<string, never>>;

export type CustomItemModel = Prisma.CustomItemGetPayload<Record<string, never>>;

export const customItemWithCountArgs = {
  include: { _count: { select: { billLineItems: true } } },
} satisfies Prisma.CustomItemDefaultArgs;

export type CustomItemWithCount = Prisma.CustomItemGetPayload<typeof customItemWithCountArgs>;

// Never select passwordHash/passwordSalt into anything sent to the client.
export const safeUserSelect = {
  id: true,
  name: true,
  username: true,
  role: true,
  pin: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;

export type ExpenseModel = Prisma.ExpenseGetPayload<Record<string, never>>;

export const supplierWithProductsArgs = {
  include: {
    products: { include: { product: true } },
  },
} satisfies Prisma.SupplierDefaultArgs;

export type SupplierWithProducts = Prisma.SupplierGetPayload<
  typeof supplierWithProductsArgs
>;

export const supplierWithLedgerArgs = {
  include: {
    products: { include: { product: true } },
    bills: { orderBy: { date: "desc" } },
    payments: { orderBy: { date: "desc" } },
  },
} satisfies Prisma.SupplierDefaultArgs;

export type SupplierWithLedger = Prisma.SupplierGetPayload<typeof supplierWithLedgerArgs>;

export type SupplierModel = Prisma.SupplierGetPayload<Record<string, never>>;

export type AuditLogModel = Prisma.AuditLogGetPayload<Record<string, never>>;

export const returnWithRelationsArgs = {
  include: {
    lineItems: { include: { product: true } },
    bill: true,
    creditAccount: true,
  },
} satisfies Prisma.ReturnTransactionDefaultArgs;

export type ReturnWithRelations = Prisma.ReturnTransactionGetPayload<
  typeof returnWithRelationsArgs
>;

export type AppSettingsModel = Prisma.AppSettingsGetPayload<Record<string, never>>;

export type ClearanceItemModel = Prisma.ClearanceItemGetPayload<Record<string, never>>;

export const creditAccountWithRelationsArgs = {
  include: {
    items: { include: { product: { include: productWithRelationsArgs.include } }, orderBy: { dateTaken: "asc" } },
    payments: { where: { isDeleted: false }, orderBy: { date: "desc" } },
    returns: { include: { lineItems: { include: { product: true } } }, orderBy: { createdAt: "desc" } },
    finalBill: true,
  },
} satisfies Prisma.CreditAccountDefaultArgs;

export type CreditAccountWithRelations = Prisma.CreditAccountGetPayload<
  typeof creditAccountWithRelationsArgs
>;

export type CreditAccountModel = Prisma.CreditAccountGetPayload<Record<string, never>>;
