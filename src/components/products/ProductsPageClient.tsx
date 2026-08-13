"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import type { CategoryModel, ProductWithRelations } from "@/types";
import type { ProductFormValues } from "@/lib/validation/product.schema";
import type { AdjustmentFormValues } from "@/lib/validation/adjustment.schema";
import type { ReceiveStockFormValues } from "@/lib/validation/receiveStock.schema";
import { fetcher, postJson, patchJson } from "@/lib/fetcher";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PinPrompt } from "@/components/ui/PinPrompt";
import { ProductFilters, type ProductFilterState } from "./ProductFilters";
import { ProductList } from "./ProductList";
import { ProductForm } from "./ProductForm";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { ReceiveStockModal } from "./ReceiveStockModal";
import { ProductImportModal } from "./ProductImportModal";

export interface ProductsPageClientProps {
  initialProducts: ProductWithRelations[];
  initialCategories: CategoryModel[];
}

const defaultFilters: ProductFilterState = {
  search: "",
  categoryIds: [],
  outOfStock: false,
  lowStock: false,
  inactive: false,
};

function buildQuery(filters: ProductFilterState): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  for (const id of filters.categoryIds) params.append("categoryId", id);
  if (filters.outOfStock) params.set("outOfStock", "true");
  if (filters.lowStock) params.set("lowStock", "true");
  if (filters.inactive) params.set("inactive", "true");
  const qs = params.toString();
  return qs ? `/api/products?${qs}` : "/api/products";
}

type FormModalState = { mode: "create" } | { mode: "edit"; product: ProductWithRelations } | null;

export function ProductsPageClient({ initialProducts, initialCategories }: ProductsPageClientProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialNewItem = searchParams.get("newItem") ?? undefined;
  const [filters, setFilters] = useState<ProductFilterState>(defaultFilters);
  const [formModal, setFormModal] = useState<FormModalState>(initialNewItem ? { mode: "create" } : null);
  const [newItemName, setNewItemName] = useState<string | undefined>(initialNewItem);
  const [adjustProduct, setAdjustProduct] = useState<ProductWithRelations | null>(null);
  const [receiveProduct, setReceiveProduct] = useState<ProductWithRelations | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ProductWithRelations | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (initialNewItem) {
      router.replace("/products");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDefaultFilters =
    !filters.search &&
    filters.categoryIds.length === 0 &&
    !filters.outOfStock &&
    !filters.lowStock &&
    !filters.inactive;

  const productsKey = useMemo(() => buildQuery(filters), [filters]);

  const { data: products, mutate: mutateProducts } = useSWR<ProductWithRelations[]>(
    productsKey,
    fetcher,
    { fallbackData: isDefaultFilters ? initialProducts : undefined },
  );

  const { data: categories } = useSWR<CategoryModel[]>(
    "/api/categories",
    fetcher,
    { fallbackData: initialCategories },
  );

  async function handleCreate(values: ProductFormValues) {
    await postJson("/api/products", values);
    await mutateProducts();
    setFormModal(null);
    showToast("Product added");
  }

  async function handleUpdate(product: ProductWithRelations, values: ProductFormValues) {
    await patchJson(`/api/products/${product.id}`, values);
    await mutateProducts();
    setFormModal(null);
    showToast("Product updated");
  }

  async function handleToggleActive(product: ProductWithRelations) {
    if (product.isActive) {
      // Marking inactive requires the Admin PIN.
      setDeactivateTarget(product);
      return;
    }
    await patchJson(`/api/products/${product.id}`, { isActive: true });
    await mutateProducts();
    showToast("Marked active");
  }

  async function confirmDeactivate(pin: string) {
    if (!deactivateTarget) return;
    await patchJson(`/api/products/${deactivateTarget.id}`, { isActive: false, pin });
    await mutateProducts();
    showToast("Marked inactive");
    setDeactivateTarget(null);
  }

  async function handleAdjust(values: AdjustmentFormValues) {
    if (!adjustProduct) return;
    await postJson(`/api/products/${adjustProduct.id}/adjust`, values);
    await mutateProducts();
    setAdjustProduct(null);
    showToast("Stock adjusted");
  }

  async function handleReceive(values: ReceiveStockFormValues) {
    if (!receiveProduct) return;
    await postJson(`/api/products/${receiveProduct.id}/receive-stock`, values);
    await mutateProducts();
    setReceiveProduct(null);
    showToast("Stock received");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Products</h1>
          <p className="text-sm text-muted">Manage inventory across all sale types.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            Import
          </Button>
          <Button onClick={() => setFormModal({ mode: "create" })}>Add Product</Button>
        </div>
      </div>

      <ProductFilters
        categories={categories ?? []}
        filters={filters}
        onChange={setFilters}
      />

      <ProductList
        products={products ?? []}
        onEdit={(product) => setFormModal({ mode: "edit", product })}
        onAdjust={(product) => setAdjustProduct(product)}
        onReceive={(product) => setReceiveProduct(product)}
        onToggleActive={handleToggleActive}
      />

      <Modal
        open={!!formModal}
        onClose={() => {
          setFormModal(null);
          setNewItemName(undefined);
        }}
        title={formModal?.mode === "edit" ? "Edit Product" : "Add Product"}
      >
        {formModal && (
          <ProductForm
            mode={formModal.mode}
            product={formModal.mode === "edit" ? formModal.product : undefined}
            initialName={formModal.mode === "create" ? newItemName : undefined}
            categories={categories ?? []}
            onCancel={() => {
              setFormModal(null);
              setNewItemName(undefined);
            }}
            onSubmit={(values) =>
              formModal.mode === "create"
                ? handleCreate(values)
                : handleUpdate(formModal.product, values)
            }
          />
        )}
      </Modal>

      <StockAdjustmentModal
        product={adjustProduct}
        onClose={() => setAdjustProduct(null)}
        onSubmit={handleAdjust}
      />

      <ReceiveStockModal
        product={receiveProduct}
        onClose={() => setReceiveProduct(null)}
        onSubmit={handleReceive}
      />

      <PinPrompt
        open={!!deactivateTarget}
        title="Confirm Mark Inactive"
        description={
          deactivateTarget
            ? `Marking "${deactivateTarget.name}" inactive requires the Admin PIN.`
            : undefined
        }
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ProductImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => mutateProducts()}
      />
    </div>
  );
}
