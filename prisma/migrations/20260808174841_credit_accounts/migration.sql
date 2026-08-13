-- CreateTable
CREATE TABLE "CreditAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "percentageIncrease" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "finalBillId" TEXT,
    CONSTRAINT "CreditAccount_finalBillId_fkey" FOREIGN KEY ("finalBillId") REFERENCES "Bill" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditAccountItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "productId" TEXT,
    "customItemName" TEXT,
    "itemName" TEXT NOT NULL,
    "saleKind" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "cutLength" REAL,
    "unitsSold" REAL NOT NULL,
    "priceAtTimeTaken" REAL NOT NULL,
    "notes" TEXT,
    "dateTaken" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditAccountItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CreditAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CreditAccountItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditAccountPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "enteredBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditAccountPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CreditAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReturnTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnNumber" INTEGER NOT NULL,
    "billId" TEXT,
    "customerName" TEXT NOT NULL,
    "refundAmount" REAL NOT NULL,
    "refundMethod" TEXT NOT NULL DEFAULT 'CASH',
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditAccountId" TEXT,
    CONSTRAINT "ReturnTransaction_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReturnTransaction_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "CreditAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ReturnTransaction" ("billId", "createdAt", "createdBy", "customerName", "id", "reason", "refundAmount", "refundMethod", "returnNumber") SELECT "billId", "createdAt", "createdBy", "customerName", "id", "reason", "refundAmount", "refundMethod", "returnNumber" FROM "ReturnTransaction";
DROP TABLE "ReturnTransaction";
ALTER TABLE "new_ReturnTransaction" RENAME TO "ReturnTransaction";
CREATE UNIQUE INDEX "ReturnTransaction_returnNumber_key" ON "ReturnTransaction"("returnNumber");
CREATE INDEX "ReturnTransaction_billId_idx" ON "ReturnTransaction"("billId");
CREATE INDEX "ReturnTransaction_creditAccountId_idx" ON "ReturnTransaction"("creditAccountId");
CREATE INDEX "ReturnTransaction_createdAt_idx" ON "ReturnTransaction"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CreditAccount_accountNumber_key" ON "CreditAccount"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CreditAccount_finalBillId_key" ON "CreditAccount"("finalBillId");

-- CreateIndex
CREATE INDEX "CreditAccount_status_idx" ON "CreditAccount"("status");

-- CreateIndex
CREATE INDEX "CreditAccountItem_accountId_idx" ON "CreditAccountItem"("accountId");

-- CreateIndex
CREATE INDEX "CreditAccountItem_productId_idx" ON "CreditAccountItem"("productId");

-- CreateIndex
CREATE INDEX "CreditAccountPayment_accountId_idx" ON "CreditAccountPayment"("accountId");

