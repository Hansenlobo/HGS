-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billNumber" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerNotes" TEXT,
    "partyPercentage" REAL,
    "subtotal" REAL NOT NULL,
    "discountTotal" REAL NOT NULL,
    "shopAmount" REAL NOT NULL,
    "marginAmount" REAL NOT NULL DEFAULT 0,
    "customerAmount" REAL NOT NULL,
    "overallDiscountType" TEXT,
    "overallDiscountValue" REAL NOT NULL DEFAULT 0,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" DATETIME,
    "cancelledBy" TEXT,
    "cancelReason" TEXT,
    "sourceOrderId" TEXT,
    "sourceQuotationId" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bill_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "TemporaryOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bill_sourceQuotationId_fkey" FOREIGN KEY ("sourceQuotationId") REFERENCES "Quotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Bill" ("billNumber", "cancelReason", "cancelledAt", "cancelledBy", "createdAt", "createdBy", "customerAmount", "customerName", "customerNotes", "customerPhone", "discountTotal", "id", "isCancelled", "marginAmount", "partyPercentage", "shopAmount", "sourceOrderId", "sourceQuotationId", "subtotal", "type", "updatedAt") SELECT "billNumber", "cancelReason", "cancelledAt", "cancelledBy", "createdAt", "createdBy", "customerAmount", "customerName", "customerNotes", "customerPhone", "discountTotal", "id", "isCancelled", "marginAmount", "partyPercentage", "shopAmount", "sourceOrderId", "sourceQuotationId", "subtotal", "type", "updatedAt" FROM "Bill";
DROP TABLE "Bill";
ALTER TABLE "new_Bill" RENAME TO "Bill";
CREATE UNIQUE INDEX "Bill_billNumber_key" ON "Bill"("billNumber");
CREATE UNIQUE INDEX "Bill_sourceOrderId_key" ON "Bill"("sourceOrderId");
CREATE UNIQUE INDEX "Bill_sourceQuotationId_key" ON "Bill"("sourceQuotationId");
CREATE INDEX "Bill_type_idx" ON "Bill"("type");
CREATE INDEX "Bill_isCancelled_idx" ON "Bill"("isCancelled");
CREATE INDEX "Bill_customerName_idx" ON "Bill"("customerName");
CREATE INDEX "Bill_createdAt_idx" ON "Bill"("createdAt");
CREATE TABLE "new_Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerNotes" TEXT,
    "partyPercentage" REAL NOT NULL DEFAULT 0,
    "subtotal" REAL NOT NULL,
    "discountTotal" REAL NOT NULL,
    "shopAmount" REAL NOT NULL,
    "marginAmount" REAL NOT NULL DEFAULT 0,
    "customerAmount" REAL NOT NULL,
    "overallDiscountType" TEXT,
    "overallDiscountValue" REAL NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Quotation" ("createdAt", "createdBy", "customerAmount", "customerName", "customerNotes", "customerPhone", "discountTotal", "id", "marginAmount", "partyPercentage", "quotationNumber", "shopAmount", "status", "subtotal", "updatedAt") SELECT "createdAt", "createdBy", "customerAmount", "customerName", "customerNotes", "customerPhone", "discountTotal", "id", "marginAmount", "partyPercentage", "quotationNumber", "shopAmount", "status", "subtotal", "updatedAt" FROM "Quotation";
DROP TABLE "Quotation";
ALTER TABLE "new_Quotation" RENAME TO "Quotation";
CREATE UNIQUE INDEX "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");
CREATE INDEX "Quotation_customerName_idx" ON "Quotation"("customerName");
CREATE INDEX "Quotation_createdAt_idx" ON "Quotation"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
