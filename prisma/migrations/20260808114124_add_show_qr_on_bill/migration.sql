-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
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
    "showQrOnBill" BOOLEAN NOT NULL DEFAULT true,
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
INSERT INTO "new_AppSettings" ("adminPin", "backupEveryNTransactions", "backupFrequency", "backupPath", "currency", "enableCreditAccounts", "enablePartyBilling", "gstNumber", "id", "invoicePrefix", "logoUrl", "minPasswordLength", "printFormat", "storeAddress", "storeName", "storePhone", "timezone", "updatedAt", "upiId") SELECT "adminPin", "backupEveryNTransactions", "backupFrequency", "backupPath", "currency", "enableCreditAccounts", "enablePartyBilling", "gstNumber", "id", "invoicePrefix", "logoUrl", "minPasswordLength", "printFormat", "storeAddress", "storeName", "storePhone", "timezone", "updatedAt", "upiId" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

