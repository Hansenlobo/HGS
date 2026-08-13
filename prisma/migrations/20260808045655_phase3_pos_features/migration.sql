-- DropIndex
DROP INDEX "Bill_type_billNumber_key";

-- AlterTable
ALTER TABLE "BillLineItem" ADD COLUMN "note" TEXT;

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "outstandingBalance" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductSupplier" (
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,

    PRIMARY KEY ("productId", "supplierId"),
    CONSTRAINT "ProductSupplier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userName" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ReturnTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnNumber" INTEGER NOT NULL,
    "billId" TEXT,
    "customerName" TEXT NOT NULL,
    "refundAmount" REAL NOT NULL,
    "refundMethod" TEXT NOT NULL DEFAULT 'CASH',
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReturnTransaction_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnId" TEXT NOT NULL,
    "productId" TEXT,
    "itemName" TEXT NOT NULL,
    "saleKind" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "cutLength" REAL,
    "rate" REAL NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "ReturnLineItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReturnLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "storeName" TEXT,
    "storeAddress" TEXT,
    "storePhone" TEXT,
    "gstNumber" TEXT,
    "logoUrl" TEXT,
    "upiId" TEXT,
    "adminPin" TEXT,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 6,
    "printFormat" TEXT NOT NULL DEFAULT 'THERMAL_3IN',
    "enableCreditAccounts" BOOLEAN NOT NULL DEFAULT true,
    "enablePartyBilling" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'HGS-',
    "backupPath" TEXT,
    "backupFrequency" TEXT NOT NULL DEFAULT 'DAILY',
    "backupEveryNTransactions" INTEGER,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "lastRate" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CustomItem" ("createdAt", "id", "lastRate", "name", "updatedAt") SELECT "createdAt", "id", "lastRate", "name", "updatedAt" FROM "CustomItem";
DROP TABLE "CustomItem";
ALTER TABLE "new_CustomItem" RENAME TO "CustomItem";
CREATE UNIQUE INDEX "CustomItem_name_key" ON "CustomItem"("name");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "enteredBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "billId", "createdAt", "deletedAt", "deletedBy", "enteredBy", "id", "isDeleted", "notes", "updatedAt") SELECT "amount", "billId", "createdAt", "deletedAt", "deletedBy", "enteredBy", "id", "isDeleted", "notes", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE INDEX "Payment_billId_idx" ON "Payment"("billId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnTransaction_returnNumber_key" ON "ReturnTransaction"("returnNumber");

-- CreateIndex
CREATE INDEX "ReturnTransaction_billId_idx" ON "ReturnTransaction"("billId");

-- CreateIndex
CREATE INDEX "ReturnTransaction_createdAt_idx" ON "ReturnTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "ReturnLineItem_returnId_idx" ON "ReturnLineItem"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_billNumber_key" ON "Bill"("billNumber");
