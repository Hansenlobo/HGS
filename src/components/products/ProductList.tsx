import type { ProductWithRelations } from "@/types";
import { ProductCard } from "./ProductCard";
import { ProductTableRow } from "./ProductTableRow";

export interface ProductListProps {
  products: ProductWithRelations[];
  onEdit: (product: ProductWithRelations) => void;
  onAdjust: (product: ProductWithRelations) => void;
  onReceive: (product: ProductWithRelations) => void;
  onToggleActive: (product: ProductWithRelations) => void;
}

export function ProductList({ products, onEdit, onAdjust, onReceive, onToggleActive }: ProductListProps) {
  if (products.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No products match your filters.</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={() => onEdit(product)}
            onAdjust={() => onAdjust(product)}
            onReceive={() => onReceive(product)}
            onToggleActive={() => onToggleActive(product)}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Categories</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Shelf</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <ProductTableRow
                key={product.id}
                product={product}
                onEdit={() => onEdit(product)}
                onAdjust={() => onAdjust(product)}
                onReceive={() => onReceive(product)}
                onToggleActive={() => onToggleActive(product)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
