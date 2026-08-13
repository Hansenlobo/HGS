export const productImportColumns = [
  "name",
  "saleType",
  "categories",
  "notes",
  "minStock",
  "shelfLocation",
  "isPartyProduct",
  "isActive",
  "costPrice",
  "sellingPrice",
  "currentStock",
  "fullLengthValue",
  "unitLabel",
  "fullLengthCostPrice",
  "fullLengthPrice",
  "cutUnitCostPrice",
  "cutUnitPrice",
  "fullLengthCount",
  "boxSize",
  "boxCostPrice",
  "boxPrice",
  "looseUnitCostPrice",
  "looseUnitPrice",
  "boxCount",
  "looseCount",
] as const;

export type ProductImportColumn = (typeof productImportColumns)[number];

export interface ProductImportRow {
  raw: Record<ProductImportColumn, string>;
  rowNumber: number;
}

/** saleType must be SIMPLE, LENGTH, or BOX. categories is a semicolon-separated
 * list of category names (created automatically if they don't exist yet).
 * Only the columns relevant to a row's saleType need values — the rest can
 * be left blank. Existing products are matched and updated by exact name;
 * anything new is created. */
export function buildProductImportTemplate(): string {
  const header = productImportColumns.join(",");
  const simpleExample = [
    "Water Pot",
    "SIMPLE",
    "Plumbing",
    "",
    "3",
    "A1",
    "false",
    "true",
    "8",
    "15",
    "10",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ].join(",");
  const lengthExample = [
    "PVC Pipe",
    "LENGTH",
    "Plumbing",
    "",
    "2",
    "B2",
    "false",
    "true",
    "",
    "",
    "",
    "20",
    "ft",
    "18",
    "25",
    "1",
    "1.5",
    "5",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ].join(",");
  const boxExample = [
    "Screws",
    "BOX",
    "Fasteners",
    "",
    "2",
    "C3",
    "false",
    "true",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "100",
    "6",
    "8",
    "0.1",
    "0.15",
    "4",
    "20",
  ].join(",");
  return [header, simpleExample, lengthExample, boxExample].join("\r\n");
}

export function rowsFromCsv(rows: string[][]): ProductImportRow[] {
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells, i) => {
    const raw = {} as Record<ProductImportColumn, string>;
    for (const col of productImportColumns) {
      const idx = header.indexOf(col);
      raw[col] = idx >= 0 ? (cells[idx] ?? "").trim() : "";
    }
    return { raw, rowNumber: i + 2 };
  });
}
