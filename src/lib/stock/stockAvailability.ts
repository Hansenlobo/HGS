import type { ProductWithRelations } from "@/types";
import { formatNumber } from "@/lib/stock/stockDisplay";

export interface LineAvailabilityInput {
  saleKind: "SIMPLE" | "LENGTH_FULL" | "LENGTH_CUT" | "BOX_FULL" | "BOX_LOOSE" | "CUSTOM";
  quantity: number;
  cutLength?: number;
}

export interface LineAvailabilityResult {
  ok: boolean;
  shortfall?: string;
}

/** Pure, no-I/O simulation of whether a sale line can be fulfilled from
 * currently-loaded stock numbers — mirrors the exact rules the stock
 * service enforces (box-opening loop, cut-length exact-match-or-open-fresh)
 * without mutating anything. Used for live client-side feedback and as a
 * fast pre-transaction server-side batch check; the transaction's own
 * InsufficientStockError remains the authoritative race-safe guard. */
export function checkLineAvailability(
  product: ProductWithRelations,
  line: LineAvailabilityInput,
): LineAvailabilityResult {
  switch (line.saleKind) {
    case "CUSTOM":
      return { ok: true };

    case "SIMPLE": {
      const current = product.currentStock ?? 0;
      if (current < line.quantity) {
        return { ok: false, shortfall: `Only ${current} in stock, need ${line.quantity}` };
      }
      return { ok: true };
    }

    case "LENGTH_FULL": {
      const count = product.fullLengthCount ?? 0;
      if (count < line.quantity) {
        return { ok: false, shortfall: `Only ${count} full length(s) in stock, need ${line.quantity}` };
      }
      return { ok: true };
    }

    case "LENGTH_CUT": {
      const neededLength = line.cutLength ?? 0;
      let remaining = line.quantity;

      const exact = product.cutPieces.find((p) => p.length === neededLength);
      if (exact) remaining -= Math.min(exact.quantity, remaining);

      if (remaining > 0) {
        const donors = product.cutPieces.filter((p) => p.length > neededLength && p.quantity > 0);
        for (const donor of donors) {
          if (remaining <= 0) break;
          remaining -= Math.min(donor.quantity, remaining);
        }
      }

      if (remaining <= 0) return { ok: true };

      const fullLengthValue = product.fullLengthValue ?? 0;
      if (neededLength > fullLengthValue) {
        return {
          ok: false,
          shortfall: `${formatNumber(neededLength)}${product.unitLabel ?? ""} exceeds the full length (${formatNumber(fullLengthValue)}${product.unitLabel ?? ""})`,
        };
      }
      const count = product.fullLengthCount ?? 0;
      if (count < remaining) {
        return {
          ok: false,
          shortfall: `No matching or larger cut piece, and only ${count} full length(s) available to cut from — short by ${remaining - count}`,
        };
      }
      return { ok: true };
    }

    case "BOX_FULL": {
      const count = product.boxCount ?? 0;
      if (count < line.quantity) {
        return { ok: false, shortfall: `Only ${count} box(es) in stock, need ${line.quantity}` };
      }
      return { ok: true };
    }

    case "BOX_LOOSE": {
      const boxCount = product.boxCount ?? 0;
      const looseCount = product.looseCount ?? 0;
      const boxSize = product.boxSize ?? 0;
      const available = boxCount * boxSize + looseCount;
      if (available < line.quantity) {
        return {
          ok: false,
          shortfall: `Only ${available} loose unit(s) available (including unopened boxes), need ${line.quantity}`,
        };
      }
      return { ok: true };
    }
  }
}
