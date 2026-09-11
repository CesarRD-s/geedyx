"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Pencil, SearchX, Trash2 } from "lucide-react";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/lib/api/client";
import type { CategorySummary } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  mobileListClass,
  rowHoverClass,
  successBannerClass,
  tableWrapClass,
  tdClass,
  theadRowClass,
  thClass,
  tbodyRowClass,
} from "@/components/ui/styles";
import { CategoryFormDialog } from "./category-form-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; category: CategorySummary }
  | { mode: "delete"; category: CategorySummary }
  | null;

export function CategoriesView({
  initialCategories,
}: {
  initialCategories: CategorySummary[];
}) {
  const [categories, setCategories] =
    useState<CategorySummary[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!banner) {
      return;
    }
    const timer = window.setTimeout(() => setBanner(null), 4000);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return categories;
    }
    return categories.filter((category) =>
      category.name.toLowerCase().includes(query),
    );
  }, [categories, search]);

  async function refreshList() {
    setCategories(await listCategories());
  }

  async function handleSave(name: string) {
    if (dialog?.mode === "edit") {
      await updateCategory(dialog.category.id, { name });
      setBanner(`Categoría actualizada a “${name}”.`);
    } else {
      await createCategory({ name });
      setBanner(`Categoría “${name}” creada.`);
    }
    await refreshList();
    setDialog(null);
  }

  async function handleDelete() {
    if (dialog?.mode !== "delete") {
      return;
    }
    await deleteCategory(dialog.category.id);
    setBanner(`Categoría “${dialog.category.name}” eliminada.`);
    await refreshList();
    setDialog(null);
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Categorías"
        description="Organiza los productos por categorías."
        action={
          <Button variant="primary" onClick={() => setDialog({ mode: "create" })}>
            Nueva categoría
          </Button>
        }
      />

      {banner ? (
        <p role="status" className={successBannerClass}>
          {banner}
        </p>
      ) : null}

      {categories.length > 0 ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SearchInput
            id="category-search"
            label="Buscar categorías"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre…"
            className="w-full max-w-sm"
          />
          <p className="text-sm text-muted">
            {visible.length} {visible.length === 1 ? "categoría" : "categorías"}
          </p>
        </div>
      ) : null}

      {categories.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-4 w-4" aria-hidden="true" />}
          title="Aún no hay categorías"
          description="Crea tu primera categoría para empezar a organizar los productos."
          action={
            <Button variant="primary" onClick={() => setDialog({ mode: "create" })}>
              Nueva categoría
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-4 w-4" aria-hidden="true" />}
          title="Sin resultados"
          description="No encontramos categorías que coincidan con tu búsqueda."
          action={
            <Button variant="secondary" onClick={() => setSearch("")}>
              Limpiar búsqueda
            </Button>
          }
        />
      ) : (
        <>
          <ul className={mobileListClass}>
            {visible.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {category.name}
                  </p>
                  <p className="truncate font-mono text-xs text-muted">
                    {category.slug}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconButton
                    label={`Editar categoría ${category.name}`}
                    tooltip="Editar"
                    onClick={() => setDialog({ mode: "edit", category })}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Eliminar categoría ${category.name}`}
                    tooltip="Eliminar"
                    tone="danger"
                    onClick={() => setDialog({ mode: "delete", category })}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>

          <div className={tableWrapClass}>
            <table className="hidden w-full text-sm sm:table">
              <caption className="sr-only">Lista de categorías</caption>
              <thead>
                <tr className={theadRowClass}>
                  <th className={thClass}>Categoría</th>
                  <th className={thClass}>Slug</th>
                  <th className={`${thClass} text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody className={tbodyRowClass}>
                {visible.map((category) => (
                  <tr key={category.id} className={rowHoverClass}>
                    <td className={`${tdClass} font-medium text-foreground`}>
                      {category.name}
                    </td>
                    <td className={`${tdClass} font-mono text-xs text-muted`}>
                      {category.slug}
                    </td>
                    <td className={tdClass}>
                      <div className="flex justify-end gap-1">
                        <IconButton
                          label={`Editar categoría ${category.name}`}
                          tooltip="Editar"
                          onClick={() => setDialog({ mode: "edit", category })}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          label={`Eliminar categoría ${category.name}`}
                          tooltip="Eliminar"
                          tone="danger"
                          onClick={() => setDialog({ mode: "delete", category })}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {dialog?.mode === "create" ? (
        <CategoryFormDialog
          mode="create"
          onSave={handleSave}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.mode === "edit" ? (
        <CategoryFormDialog
          mode="edit"
          categoryName={dialog.category.name}
          onSave={handleSave}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.mode === "delete" ? (
        <DeleteCategoryDialog
          categoryName={dialog.category.name}
          onConfirm={handleDelete}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </section>
  );
}