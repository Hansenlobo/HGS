-- CreateTable
CREATE TABLE "ClearanceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "originalPrice" REAL,
    "discountedPrice" REAL NOT NULL,
    "quantityAvailable" INTEGER,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "addedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ClearanceItem_status_idx" ON "ClearanceItem"("status");

-- CreateIndex
CREATE INDEX "ClearanceItem_createdAt_idx" ON "ClearanceItem"("createdAt");
