-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "imageUrl" TEXT,
    "minStock" REAL NOT NULL DEFAULT 0,
    "shelfLocation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPartyProduct" BOOLEAN NOT NULL DEFAULT false,
    "saleType" TEXT NOT NULL,
    "costPrice" REAL,
    "sellingPrice" REAL,
    "currentStock" INTEGER,
    "fullLengthValue" REAL,
    "unitLabel" TEXT,
    "fullLengthCostPrice" REAL,
    "fullLengthPrice" REAL,
    "cutUnitCostPrice" REAL,
    "cutUnitPrice" REAL,
    "fullLengthCount" INTEGER,
    "boxSize" INTEGER,
    "boxCostPrice" REAL,
    "boxPrice" REAL,
    "looseUnitCostPrice" REAL,
    "looseUnitPrice" REAL,
    "boxCount" INTEGER,
    "looseCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("boxCostPrice", "boxCount", "boxPrice", "boxSize", "costPrice", "createdAt", "currentStock", "cutUnitCostPrice", "cutUnitPrice", "fullLengthCostPrice", "fullLengthCount", "fullLengthPrice", "fullLengthValue", "id", "imageUrl", "isActive", "looseCount", "looseUnitCostPrice", "looseUnitPrice", "minStock", "name", "notes", "saleType", "sellingPrice", "shelfLocation", "unitLabel", "updatedAt") SELECT "boxCostPrice", "boxCount", "boxPrice", "boxSize", "costPrice", "createdAt", "currentStock", "cutUnitCostPrice", "cutUnitPrice", "fullLengthCostPrice", "fullLengthCount", "fullLengthPrice", "fullLengthValue", "id", "imageUrl", "isActive", "looseCount", "looseUnitCostPrice", "looseUnitPrice", "minStock", "name", "notes", "saleType", "sellingPrice", "shelfLocation", "unitLabel", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_saleType_idx" ON "Product"("saleType");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
