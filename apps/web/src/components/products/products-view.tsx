"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  PackageX,
  Pencil,
  SearchX,
  Trash2,
} from "lucide-react";
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  getProduct,
  updateProduct,
  uploadProductImage,
} from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/http";
import type {
  CategorySummary,
  ProductDetail,
  ProductInput,
  ProductListItem,
  ProductListQuery,
  ProductSortField,
} from "@/lib/api/types";
import {
  DEFAULT_LIMIT,
  PRODUCT_LIMITS,
  productQueryToSearchParams,
} from "@/lib/products/query";
import { formatPrice, productImageUrl } from "@/lib/products/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { FieldLabel, Select } from "@/components/ui/field";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  errorBannerClass,
  mobileListClass,
  rowHoverClass,
  successBannerClass,
  tableWrapClass,
  tdClass,
  theadRowClass,
  thClass,
  tbodyRowClass,
} from "@/components/ui/styles";
import { DeleteProductDialog } from "./delete-product-dialog";
import { ProductFormDialog } from "./product-form-dialog";

const TOOLBAR_WRAP =
  "rounded-md bg-surface-subtle p-3";
const TOOLBAR_ROW = "flex flex-wrap items-end gap-3";
const TOOLBAR_SUBROW =
  "mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3";

interface ProductsViewProps {
  initialPage: {
    data: ProductListItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  };
  categories: CategorySummary[];
  initialQuery: ProductListQuery;
  canManage: boolean;
}

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; product: ProductDetail }
  | { mode: "delete"; product: ProductListItem }
  | null;

interface Banner {
  text: string;
  kind: "success" | "error";
}

function StatusCell({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge tone="success">Activo</Badge>
  ) : (
    <Badge tone="neutral">Inactivo</Badge>
  );
}

function StockCell({ product }: { product: ProductListItem }) {
  if (product.stock === 0) {
    return <Badge tone="danger">0 · Agotado</Badge>;
  }
  if (product.stock <= product.lowStockThreshold) {
    return (
      <Badge
        tone="warning"
        dot={false}
      >
        <span title={`Umbral de stock bajo: ${product.lowStockThreshold}`}>
          {product.stock} · Bajo
        </span>
      </Badge>
    );
  }
  return <span className="text-sm text-foreground">{product.stock}</span>;
}

function Thumbnail({ imageUrl }: { imageUrl: string | null }) {
  const url = productImageUrl(imageUrl);
  if (!url) {
    return (
      <div className="h-10 w-10 rounded-md border border-border bg-surface-subtle" />
    );
  }
  return (
    <img
      src={url}
      alt=""
      className="h-10 w-10 rounded-md border border-border object-cover"
    />
  );
}

export function ProductsView({
  initialPage,
  categories,
  initialQuery,
  canManage,
}: ProductsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const products = initialPage.data;
  const meta = initialPage.meta;

  const [search, setSearch] = useState(initialQuery.search ?? "");
  const [categoryId, setCategoryId] = useState(initialQuery.categoryId ?? "");
  const [status, setStatus] = useState<"all" | "true" | "false">(
    initialQuery.isActive === undefined
      ? "all"
      : initialQuery.isActive
        ? "true"
        : "false",
  );
  const [sort, setSort] = useState<ProductSortField>(initialQuery.sort);
  const [order, setOrder] = useState<"asc" | "desc">(initialQuery.order);
  const [limit, setLimit] = useState(initialQuery.limit);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);

  const queryKey = JSON.stringify(initialQuery);
  const [prevQueryKey, setPrevQueryKey] = useState(queryKey);
  if (queryKey !== prevQueryKey) {
    setPrevQueryKey(queryKey);
    setCategoryId(initialQuery.categoryId ?? "");
    setStatus(
      initialQuery.isActive === undefined
        ? "all"
        : initialQuery.isActive
          ? "true"
          : "false",
    );
    setSort(initialQuery.sort);
    setOrder(initialQuery.order);
    setLimit(initialQuery.limit);
    setSearch(initialQuery.search ?? "");
  }

  useEffect(() => {
    if (!banner) {
      return;
    }
    const timer = window.setTimeout(() => setBanner(null), 4000);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (search.trim() === (initialQuery.search ?? "")) {
      return;
    }
    const timer = window.setTimeout(() => {
      commitRef.current({ search: search.trim() || undefined, page: 1 });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search, initialQuery.search]);

  useEffect(() => {
    if (products.length === 0 && meta.total > 0 && meta.page > 1) {
      commitRef.current({ page: meta.page - 1 });
    }
  }, [products.length, meta.total, meta.page]);

  function commit(
    overrides: Partial<Omit<ProductListQuery, "page" | "limit" | "sort" | "order">> &
      Partial<Pick<ProductListQuery, "page" | "limit" | "sort" | "order">>,
  ) {
    const next: ProductListQuery = {
      page: overrides.page ?? meta.page,
      limit: overrides.limit ?? limit,
      sort: overrides.sort ?? sort,
      order: overrides.order ?? order,
      search: overrides.search ?? (search.trim() || undefined),
      categoryId: overrides.categoryId ?? (categoryId || undefined),
      isActive:
        overrides.isActive ??
        (status === "all" ? undefined : status === "true" ? true : false),
    };
    go(next);
  }

  function go(query: ProductListQuery) {
    const params = productQueryToSearchParams(query);
    router.push(`${pathname}?${params.toString()}`);
  }

  function resetAll() {
    setSearch("");
    setCategoryId("");
    setStatus("all");
    setSort("createdAt");
    setOrder("desc");
    setLimit(DEFAULT_LIMIT);
    go({
      page: 1,
      limit: DEFAULT_LIMIT,
      sort: "createdAt",
      order: "desc",
    });
  }

  const hasActiveControls =
    Boolean(search) ||
    Boolean(categoryId) ||
    status !== "all" ||
    sort !== "createdAt" ||
    order !== "desc" ||
    limit !== DEFAULT_LIMIT;

  function openCreate() {
    setDialog({ mode: "create" });
  }

  async function openEdit(product: ProductListItem) {
    try {
      const detail = await getProduct(product.id);
      setDialog({ mode: "edit", product: detail });
    } catch (error) {
      setBanner({ text: apiErrorMessage(error), kind: "error" });
    }
  }

  function openDelete(product: ProductListItem) {
    setDialog({ mode: "delete", product });
  }

  async function handleCreate(values: ProductInput, image: File | null) {
    const created = await createProduct(values);
    let note: string | null = null;
    if (image) {
      try {
        await uploadProductImage(created.id, image);
      } catch {
        note = "No se pudo subir la imagen.";
      }
    }
    setBanner({
      text: note ?? "Producto creado correctamente.",
      kind: note ? "error" : "success",
    });
    setDialog(null);
    router.refresh();
  }

  async function handleUpdate(
    product: ProductDetail,
    values: ProductInput,
    image: File | null,
  ) {
    await updateProduct(product.id, values);
    let note: string | null = null;
    if (image) {
      try {
        await uploadProductImage(product.id, image);
      } catch {
        note = "No se pudo actualizar la imagen.";
      }
    }
    setBanner({
      text: note ?? "Producto actualizado correctamente.",
      kind: note ? "error" : "success",
    });
    setDialog(null);
    router.refresh();
  }

  async function handleDelete() {
    if (dialog?.mode !== "delete") {
      return;
    }
    await deleteProduct(dialog.product.id);
    setBanner({
      text: "Producto eliminado correctamente.",
      kind: "success",
    });
    setDialog(null);
    if (products.length === 1 && meta.page > 1) {
      commit({ page: meta.page - 1 });
    } else {
      router.refresh();
    }
  }

  async function handleToggle(product: ProductListItem) {
    setPendingToggleId(product.id);
    try {
      await updateProduct(product.id, { isActive: !product.isActive });
      setBanner({
        text: product.isActive
          ? "Producto desactivado."
          : "Producto activado.",
        kind: "success",
      });
      router.refresh();
    } catch (error) {
      setBanner({ text: apiErrorMessage(error), kind: "error" });
    } finally {
      setPendingToggleId(null);
    }
  }

  async function handleDeleteImage(): Promise<void> {
    if (dialog?.mode !== "edit") {
      return;
    }
    await deleteProductImage(dialog.product.id);
    setBanner({ text: "Imagen eliminada.", kind: "success" });
    router.refresh();
  }

  const showToolbar = meta.total > 0 || hasActiveControls;
  const showEmpty =
    meta.total === 0 &&
    !search &&
    !categoryId &&
    status === "all";
  const showNoResults = meta.total > 0 && products.length === 0;

  return (
    <section className="space-y-4">
      <PageHeader
        title="Productos"
        description="Administra el catálogo, el inventario y las imágenes de tus productos."
        action={canManage ? (
          <Button variant="primary" onClick={openCreate}>
            Nuevo producto
          </Button>
        ) : undefined}
      />

      {banner ? (
        <p
          role="status"
          className={banner.kind === "success" ? successBannerClass : errorBannerClass}
        >
          {banner.text}
        </p>
      ) : null}

      {showToolbar ? (
        <div className={TOOLBAR_WRAP}>
          <div className={TOOLBAR_ROW}>
            <SearchInput
              id="product-search"
              label="Buscar productos"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o SKU…"
              className="min-w-[220px] flex-1"
            />
            <div>
              <FieldLabel htmlFor="product-category-filter">Categoría</FieldLabel>
              <Select
                id="product-category-filter"
                value={categoryId}
                onChange={(event) => {
                  const value = event.target.value;
                  setCategoryId(value);
                  commit({ categoryId: value || undefined, page: 1 });
                }}
              >
                <option value="">Todas las categorías</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="product-status-filter">Estado</FieldLabel>
              <Select
                id="product-status-filter"
                value={status}
                onChange={(event) => {
                  const value = event.target
                    .value as "all" | "true" | "false";
                  setStatus(value);
                  const isActive =
                    value === "all" ? undefined : value === "true";
                  commit({ isActive, page: 1 });
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="true">Solo activos</option>
                <option value="false">Solo inactivos</option>
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="product-sort">Ordenar por</FieldLabel>
              <div className="flex gap-2">
                <Select
                  id="product-sort"
                  value={sort}
                  onChange={(event) => {
                    const value = event.target.value as ProductSortField;
                    setSort(value);
                    commit({ sort: value, page: 1 });
                  }}
                >
                  <option value="createdAt">Fecha</option>
                  <option value="name">Nombre</option>
                  <option value="price">Precio</option>
                  <option value="stock">Stock</option>
                </Select>
                <IconButton
                  label={
                    order === "asc"
                      ? "Ordenar ascendente"
                      : "Ordenar descendente"
                  }
                  tooltip={order === "asc" ? "Ascendente" : "Descendente"}
                  onClick={() => {
                    const next = order === "asc" ? "desc" : "asc";
                    setOrder(next);
                    commit({ order: next, page: 1 });
                  }}
                >
                  {order === "asc" ? (
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </IconButton>
              </div>
            </div>
            {hasActiveControls ? (
              <Button variant="ghost" onClick={resetAll}>
                Limpiar filtros
              </Button>
            ) : null}
          </div>
          <div className={TOOLBAR_SUBROW}>
            <p className="text-sm text-muted">
              {meta.total} {meta.total === 1 ? "producto" : "productos"} ·
              Página {meta.page} de {meta.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <label
                htmlFor="product-page-size"
                className="text-sm text-muted"
              >
                Mostrar
              </label>
              <Select
                id="product-page-size"
                value={limit}
                className="w-auto"
                onChange={(event) => {
                  const value = Number(event.target.value) as 10 | 20 | 50;
                  setLimit(value);
                  commit({ limit: value, page: 1 });
                }}
              >
                {PRODUCT_LIMITS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                onClick={() => commit({ page: meta.page - 1 })}
                disabled={meta.page <= 1}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                onClick={() => commit({ page: meta.page + 1 })}
                disabled={meta.page >= meta.totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={<PackageX className="h-4 w-4" aria-hidden="true" />}
          title="No hay productos todavía"
          description="Crea tu primer producto para empezar a armar el catálogo."
          action={canManage ? (
            <Button variant="primary" onClick={openCreate}>
              Nuevo producto
            </Button>
          ) : undefined}
        />
      ) : showNoResults ? (
        <EmptyState
          icon={<SearchX className="h-4 w-4" aria-hidden="true" />}
          title="Sin resultados"
          description="No encontramos productos que coincidan con tu búsqueda o filtros."
          action={
            <Button variant="ghost" onClick={resetAll}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <>
          <ul className={mobileListClass}>
            {products.map((product) => (
              <li key={product.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Thumbnail imageUrl={product.imageUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {product.name}
                    </p>
                    <p className="truncate font-mono text-xs text-muted">
                      {product.sku}
                    </p>
                  </div>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Precio</dt>
                    <dd className="font-medium text-foreground">
                      {formatPrice(product.price)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Stock</dt>
                    <dd>
                      <StockCell product={product} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Categoría</dt>
                    <dd className="truncate text-foreground">
                      {product.category.name}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Estado</dt>
                    <dd>
                      <StatusCell isActive={product.isActive} />
                    </dd>
                  </div>
                </dl>
                {canManage ? <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <IconButton
                    label={`Editar ${product.name}`}
                    tooltip="Editar"
                    onClick={() => openEdit(product)}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <Button
                    variant="secondary"
                    onClick={() => openDelete(product)}
                  >
                    Eliminar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleToggle(product)}
                    disabled={pendingToggleId === product.id}
                  >
                    {product.isActive ? "Desactivar" : "Activar"}
                  </Button>
                </div> : null}
              </li>
            ))}
          </ul>

          <div className={tableWrapClass}>
            <table className="hidden w-full text-sm sm:table">
              <caption className="sr-only">Lista de productos</caption>
              <thead>
                <tr className={theadRowClass}>
                  <th className={thClass} />
                  <th className={thClass}>Producto</th>
                  <th className={thClass}>SKU</th>
                  <th className={thClass}>Categoría</th>
                  <th className={`${thClass} text-right`}>Precio</th>
                  <th className={`${thClass} text-right`}>Stock</th>
                  <th className={thClass}>Estado</th>
                  <th className={`${thClass} text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody className={tbodyRowClass}>
                {products.map((product) => (
                  <tr key={product.id} className={rowHoverClass}>
                    <td className={tdClass}>
                      <Thumbnail imageUrl={product.imageUrl} />
                    </td>
                    <td className={tdClass}>
                      <p className="font-medium text-foreground">
                        {product.name}
                      </p>
                      <p className="font-mono text-xs text-muted">
                        {product.slug}
                      </p>
                    </td>
                    <td className={`${tdClass} font-mono text-xs text-muted`}>
                      {product.sku}
                    </td>
                    <td className={`${tdClass} text-muted`}>
                      {product.category.name}
                    </td>
                    <td className={`${tdClass} text-right text-foreground`}>
                      {formatPrice(product.price)}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <StockCell product={product} />
                    </td>
                    <td className={tdClass}>
                      <StatusCell isActive={product.isActive} />
                    </td>
                    <td className={tdClass}>
                      {canManage ? <div className="flex items-center justify-end gap-1.5">
                        <IconButton
                          label={`Editar ${product.name}`}
                          tooltip="Editar"
                          onClick={() => openEdit(product)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </IconButton>
                        <Button
                          variant="ghost"
                          onClick={() => handleToggle(product)}
                          disabled={pendingToggleId === product.id}
                        >
                          {product.isActive ? "Desactivar" : "Activar"}
                        </Button>
                        <IconButton
                          label={`Eliminar ${product.name}`}
                          tooltip="Eliminar"
                          tone="danger"
                          onClick={() => openDelete(product)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </IconButton>
                      </div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canManage && dialog?.mode === "create" ? (
        <ProductFormDialog
          mode="create"
          initial={null}
          categories={categories}
          onSave={handleCreate}
          onDeleteImage={handleDeleteImage}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {canManage && dialog?.mode === "edit" ? (
        <ProductFormDialog
          mode="edit"
          initial={dialog.product}
          categories={categories}
          onSave={(values, image) =>
            handleUpdate(dialog.product, values, image)
          }
          onDeleteImage={handleDeleteImage}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {canManage && dialog?.mode === "delete" ? (
        <DeleteProductDialog
          productName={dialog.product.name}
          onConfirm={handleDelete}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </section>
  );
}
