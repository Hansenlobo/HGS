-- CreateTable
CREATE TABLE "Quotation" (
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
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuotationLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT,
    "customItemId" TEXT,
    "itemName" TEXT NOT NULL,
    "saleKind" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "cutLength" REAL,
    "unitsSold" REAL NOT NULL,
    "rate" REAL NOT NULL,
    "discountType" TEXT,
    "discountValue" REAL NOT NULL DEFAULT 0,
    "baseRate" REAL NOT NULL,
    "isPartyProduct" BOOLEAN NOT NULL DEFAULT false,
    "partyRate" REAL NOT NULL,
    "shopAmount" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuotationLineItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuotationLineItem_customItemId_fkey" FOREIGN KEY ("customItemId") REFERENCES "CustomItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuotationPrintLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "printedBy" TEXT,
    "printedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuotationPrintLog_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
INSERT INTO "new_Bill" ("billNumber", "cancelReason", "cancelledAt", "cancelledBy", "createdAt", "createdBy", "customerAmount", "customerName", "customerNotes", "customerPhone", "discountTotal", "id", "isCancelled", "marginAmount", "partyPercentage", "shopAmount", "sourceOrderId", "subtotal", "type", "updatedAt") SELECT "billNumber", "cancelReason", "cancelledAt", "cancelledBy", "createdAt", "createdBy", "customerAmount", "customerName", "customerNotes", "customerPhone", "discountTotal", "id", "isCancelled", "marginAmount", "partyPercentage", "shopAmount", "sourceOrderId", "subtotal", "type", "updatedAt" FROM "Bill";
DROP TABLE "Bill";
ALTER TABLE "new_Bill" RENAME TO "Bill";
CREATE UNIQUE INDEX "Bill_billNumber_key" ON "Bill"("billNumber");
CREATE UNIQUE INDEX "Bill_sourceOrderId_key" ON "Bill"("sourceOrderId");
CREATE UNIQUE INDEX "Bill_sourceQuotationId_key" ON "Bill"("sourceQuotationId");
CREATE INDEX "Bill_type_idx" ON "Bill"("type");
CREATE INDEX "Bill_isCancelled_idx" ON "Bill"("isCancelled");
CREATE INDEX "Bill_customerName_idx" ON "Bill"("customerName");
CREATE INDEX "Bill_createdAt_idx" ON "Bill"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");

-- CreateIndex
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");

-- CreateIndex
CREATE INDEX "Quotation_customerName_idx" ON "Quotation"("customerName");

-- CreateIndex
CREATE INDEX "Quotation_createdAt_idx" ON "Quotation"("createdAt");

-- CreateIndex
CREATE INDEX "QuotationLineItem_quotationId_idx" ON "QuotationLineItem"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationLineItem_productId_idx" ON "QuotationLineItem"("productId");

-- CreateIndex
CREATE INDEX "QuotationPrintLog_quotationId_idx" ON "QuotationPrintLog"("quotationId");
