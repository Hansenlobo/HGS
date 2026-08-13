-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StockAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "cutLength" REAL,
    "reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "direction" TEXT NOT NULL DEFAULT 'OUT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "costPrice" REAL,
    "billLineItemId" TEXT,
    "returnLineItemId" TEXT,
    "supplierId" TEXT,
    CONSTRAINT "StockAdjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockAdjustment_billLineItemId_fkey" FOREIGN KEY ("billLineItemId") REFERENCES "BillLineItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockAdjustment_returnLineItemId_fkey" FOREIGN KEY ("returnLineItemId") REFERENCES "ReturnLineItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockAdjustment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StockAdjustment" ("billLineItemId", "createdAt", "cutLength", "direction", "id", "kind", "productId", "quantity", "reason", "returnLineItemId", "source") SELECT "billLineItemId", "createdAt", "cutLength", "direction", "id", "kind", "productId", "quantity", "reason", "returnLineItemId", "source" FROM "StockAdjustment";
DROP TABLE "StockAdjustment";
ALTER TABLE "new_StockAdjustment" RENAME TO "StockAdjustment";
CREATE INDEX "StockAdjustment_productId_idx" ON "StockAdjustment"("productId");
CREATE INDEX "StockAdjustment_createdAt_idx" ON "StockAdjustment"("createdAt");
CREATE INDEX "StockAdjustment_supplierId_idx" ON "StockAdjustment"("supplierId");
CREATE INDEX "StockAdjustment_billLineItemId_idx" ON "StockAdjustment"("billLineItemId");
CREATE INDEX "StockAdjustment_returnLineItemId_idx" ON "StockAdjustment"("returnLineItemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

