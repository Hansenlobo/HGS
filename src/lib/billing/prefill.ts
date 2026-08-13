import { prisma } from "@/lib/prisma";
import {
  productWithRelationsArgs,
  orderWithRelationsArgs,
  billWithRelationsArgs,
  quotationWithRelationsArgs,
} from "@/types";
import {
  draftFromProductWithKind,
  draftFromCustomItem,
  defaultSaleKind,
  type LineDraft,
} from "@/components/billing/lineDraft";

export interface BillPrefillResult {
  initialLines: LineDraft[];
  initialCustomer: { customerName: string; customerPhone: string; customerNotes: string };
  sourceOrderId?: string;
  sourceQuotationId?: string;
}

const empty: BillPrefillResult = {
  initialLines: [],
  initialCustomer: { customerName: "", customerPhone: "", customerNotes: "" },
};

/** Pre-fills a new Normal/Party bill form either from a Temporary Order
 * being converted (fromOrder — items only, no pricing), from an existing
 * bill being duplicated (fromBill — full line pricing/discounts carried
 * over), or from a Quotation being converted (fromQuotation — full line
 * pricing/discounts carried over, same as fromBill). Server-only: reads
 * Prisma directly. */
export async function loadBillPrefill(params: {
  fromOrder?: string;
  fromBill?: string;
  fromQuotation?: string;
}): Promise<BillPrefillResult> {
  if (params.fromOrder) {
    const order = await prisma.temporaryOrder.findUnique({
      where: { id: params.fromOrder },
      ...orderWithRelationsArgs,
    });
    if (!order || order.status === "CONVERTED") return empty;

    const productIds = order.items.map((i) => i.productId).filter((id): id is string => id !== null);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      ...productWithRelationsArgs,
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const initialLines = order.items.map((item) => {
      if (item.productId) {
        const product = productMap.get(item.productId);
        if (product) {
          const saleKind = item.saleKind ?? defaultSaleKind(product);
          return {
            ...draftFromProductWithKind(product, saleKind),
            quantity: String(item.quantity),
            cutLength: item.cutLength != null ? String(item.cutLength) : "",
          };
        }
      }
      return { ...draftFromCustomItem(item.customItemName ?? "Item"), quantity: String(item.quantity) };
    });

    return {
      initialLines,
      initialCustomer: {
        customerName: order.customerName,
        customerPhone: order.customerPhone ?? "",
        customerNotes: order.customerNotes ?? "",
      },
      sourceOrderId: order.id,
    };
  }

  if (params.fromBill) {
    const bill = await prisma.bill.findUnique({
      where: { id: params.fromBill },
      ...billWithRelationsArgs,
    });
    if (!bill) return empty;

    const productIds = bill.lineItems
      .map((l) => l.productId)
      .filter((id): id is string => id !== null);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      ...productWithRelationsArgs,
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const initialLines: LineDraft[] = bill.lineItems.map((line) => {
      const product = line.productId ? productMap.get(line.productId) : undefined;
      return {
        key: `${line.id}-${Math.random()}`,
        product,
        customItemName: product ? undefined : line.itemName,
        itemName: line.itemName,
        saleKind: line.saleKind,
        quantity: String(line.quantity),
        cutLength: line.cutLength != null ? String(line.cutLength) : "",
        rate: String(line.rate),
        discountType: line.discountType ?? "",
        discountValue: String(line.discountValue),
        note: line.note ?? "",
        applyMarkup: product ? false : line.isPartyProduct,
      };
    });

    return {
      initialLines,
      initialCustomer: {
        customerName: bill.customerName,
        customerPhone: bill.customerPhone ?? "",
        customerNotes: bill.customerNotes ?? "",
      },
    };
  }

  if (params.fromQuotation) {
    const quotation = await prisma.quotation.findUnique({
      where: { id: params.fromQuotation },
      ...quotationWithRelationsArgs,
    });
    if (!quotation || quotation.status === "CONVERTED") return empty;

    const productIds = quotation.lineItems
      .map((l) => l.productId)
      .filter((id): id is string => id !== null);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      ...productWithRelationsArgs,
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const initialLines: LineDraft[] = quotation.lineItems.map((line) => {
      const product = line.productId ? productMap.get(line.productId) : undefined;
      return {
        key: `${line.id}-${Math.random()}`,
        product,
        customItemName: product ? undefined : line.itemName,
        itemName: line.itemName,
        saleKind: line.saleKind,
        quantity: String(line.quantity),
        cutLength: line.cutLength != null ? String(line.cutLength) : "",
        rate: String(line.rate),
        discountType: line.discountType ?? "",
        discountValue: String(line.discountValue),
        note: line.note ?? "",
        applyMarkup: product ? false : line.isPartyProduct,
      };
    });

    return {
      initialLines,
      initialCustomer: {
        customerName: quotation.customerName,
        customerPhone: quotation.customerPhone ?? "",
        customerNotes: quotation.customerNotes ?? "",
      },
      sourceQuotationId: quotation.id,
    };
  }

  return empty;
}
