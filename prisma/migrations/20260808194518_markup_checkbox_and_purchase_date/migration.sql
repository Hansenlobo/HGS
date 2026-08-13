-- AlterTable
ALTER TABLE "BillLineItem" ADD COLUMN "takenAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CreditAccountItem" (
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
    "applyMarkup" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "dateTaken" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditAccountItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CreditAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CreditAccountItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CreditAccountItem" ("accountId", "createdAt", "createdBy", "customItemName", "cutLength", "dateTaken", "id", "itemName", "notes", "priceAtTimeTaken", "productId", "quantity", "saleKind", "unitsSold") SELECT "accountId", "createdAt", "createdBy", "customItemName", "cutLength", "dateTaken", "id", "itemName", "notes", "priceAtTimeTaken", "productId", "quantity", "saleKind", "unitsSold" FROM "CreditAccountItem";
DROP TABLE "CreditAccountItem";
ALTER TABLE "new_CreditAccountItem" RENAME TO "CreditAccountItem";
CREATE INDEX "CreditAccountItem_accountId_idx" ON "CreditAccountItem"("accountId");
CREATE INDEX "CreditAccountItem_productId_idx" ON "CreditAccountItem"("productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

