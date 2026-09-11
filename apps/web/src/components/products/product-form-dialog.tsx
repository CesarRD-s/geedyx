"use client";

import { useRef, useState, type FormEvent } from "react";
import { ApiError, apiErrorMessage } from "@/lib/api/http";
import type {
  CategorySummary,
  ProductDetail,
  ProductInput,
} from "@/lib/api/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  FieldLabel,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { ProductImageField } from "./product-image-field";

const NAME_MAX_LENGTH = 120;
const SKU_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 1000;
const PRICE_MAX = 99_999_999.99;
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

const LEGEND_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-muted";
const CHECKBOX_CLASS =
  "h-4 w-4 rounded border-border-strong text-accent focus:ring-accent/40";

interface FormState {
  name: string;
  sku: string;
  description: string;
  price: string;
  stock: string;
  lowStockThreshold: string;
  categoryId: string;
  isActive: boolean;
}

interface ProductFormDialogProps {
  mode: "create" | "edit";
  initial: ProductDetail | null;
  categories: CategorySummary[];
  onSave: (values: ProductInput, image: File | null) => Promise<void>;
  onDeleteImage: () => Promise<void>;
  onClose: () => void;
}

function inputsFromDetail(product: ProductDetail | null): FormState {
  if (!product) {
    return {
      name: "",
      sku: "",
      description: "",
      price: "",
      stock: "",
      lowStockThreshold: "",
      categoryId: "",
      isActive: true,
    };
  }
  return {
    name: product.name,
    sku: product.sku,
    description: product.description ?? "",
    price: product.price.toFixed(2),
    stock: String(product.stock),
    lowStockThreshold: String(product.lowStockThreshold),
    categoryId: product.category.id,
    isActive: product.isActive,
  };
}

function parseNullableInteger(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function ProductFormDialog({
  mode,
  initial,
  categories,
  onSave,
  onDeleteImage,
  onClose,
}: ProductFormDialogProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<FormState>(() =>
    inputsFromDetail(initial),
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [image, setImage] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    initial?.imageUrl ?? null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteImagePending, setDeleteImagePending] = useState(false);
  const [pending, setPending] = useState(false);

  const isEdit = mode === "edit";

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function validate():
    | { ok: true; data: ProductInput }
    | { ok: false; errors: Partial<Record<keyof FormState, string>> } {
    const errors: Partial<Record<keyof FormState, string>> = {};

    const name = values.name.trim();
    if (!name) {
      errors.name = "El nombre es obligatorio.";
    } else if (name.length > NAME_MAX_LENGTH) {
      errors.name = `El nombre no puede superar los ${NAME_MAX_LENGTH} caracteres.`;
    }

    const sku = values.sku.trim();
    if (!sku) {
      errors.sku = "El SKU es obligatorio.";
    } else if (sku.length > SKU_MAX_LENGTH) {
      errors.sku = `El SKU no puede superar los ${SKU_MAX_LENGTH} caracteres.`;
    }

    const description = values.description.trim();
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      errors.description = `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres.`;
    }

    const pricePattern = /^\d+(\.\d{1,2})?$/;
    const priceValue = values.price.trim().replace(",", ".");
    const priceNumber = pricePattern.test(priceValue)
      ? Number(priceValue)
      : Number.NaN;
    if (!pricePattern.test(priceValue) || Number.isNaN(priceNumber)) {
      errors.price = "El precio debe ser un número con hasta dos decimales.";
    } else if (priceNumber < 0 || priceNumber > PRICE_MAX) {
      errors.price = `El precio debe estar entre 0 y ${PRICE_MAX.toLocaleString("es-MX")}.`;
    }

    const stock = parseNullableInteger(values.stock);
    if (stock === undefined && values.stock.trim() !== "") {
      errors.stock = "El stock debe ser un número entero mayor o igual a 0.";
    }

    const threshold = parseNullableInteger(values.lowStockThreshold);
    if (threshold === undefined && values.lowStockThreshold.trim() !== "") {
      errors.lowStockThreshold =
        "El umbral debe ser un número entero mayor o igual a 0.";
    }

    if (!values.categoryId) {
      errors.categoryId = "Selecciona una categoría.";
    }

    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }

    return {
      ok: true,
      data: {
        name,
        sku,
        description,
        price: Math.round(priceNumber * 100) / 100,
        stock: stock ?? 0,
        lowStockThreshold: threshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
        categoryId: values.categoryId,
        isActive: values.isActive,
      },
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validate();
    if (!result.ok) {
      setFieldErrors(result.errors);
      return;
    }
    setPending(true);
    setSubmitError(null);
    try {
      await onSave(result.data, image);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setSubmitError("Ya existe un producto con ese SKU.");
      } else if (error instanceof ApiError && error.status === 404) {
        setSubmitError("La categoría seleccionada ya no existe.");
      } else {
        setSubmitError(apiErrorMessage(error));
      }
      setPending(false);
    }
  }

  async function handleDeleteImage() {
    setDeleteImagePending(true);
    setSubmitError(null);
    try {
      await onDeleteImage();
      setCurrentImageUrl(null);
      setImage(null);
    } catch (error) {
      setSubmitError(apiErrorMessage(error));
    } finally {
      setDeleteImagePending(false);
    }
  }

  return (
    <Dialog
      title={isEdit ? "Editar producto" : "Nuevo producto"}
      description="Información del producto, inventario e imagen."
      onClose={onClose}
      initialFocusRef={nameInputRef}
      size="md"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="product-form"
            variant="primary"
            loading={pending}
            loadingLabel="Guardando…"
            disabled={pending}
          >
            {isEdit ? "Guardar cambios" : "Crear producto"}
          </Button>
        </>
      }
    >
      <form
        id="product-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5"
      >
        <fieldset className="space-y-4">
          <legend className={LEGEND_CLASS}>Información básica</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="product-name">Nombre</FieldLabel>
              <Input
                ref={nameInputRef}
                id="product-name"
                type="text"
                value={values.name}
                onChange={(event) => setField("name", event.target.value)}
                maxLength={NAME_MAX_LENGTH}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name ? (
                <FieldError>{fieldErrors.name}</FieldError>
              ) : null}
            </div>
            <div>
              <FieldLabel htmlFor="product-sku">SKU</FieldLabel>
              <Input
                id="product-sku"
                type="text"
                value={values.sku}
                onChange={(event) => setField("sku", event.target.value)}
                maxLength={SKU_MAX_LENGTH}
                aria-invalid={Boolean(fieldErrors.sku)}
                className="font-mono"
              />
              {fieldErrors.sku ? (
                <FieldError>{fieldErrors.sku}</FieldError>
              ) : null}
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="product-description">Descripción</FieldLabel>
            <Textarea
              id="product-description"
              rows={3}
              value={values.description}
              onChange={(event) =>
                setField("description", event.target.value)
              }
              maxLength={DESCRIPTION_MAX_LENGTH}
              aria-invalid={Boolean(fieldErrors.description)}
            />
            {fieldErrors.description ? (
              <FieldError>{fieldErrors.description}</FieldError>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor="product-category">Categoría</FieldLabel>
            <Select
              id="product-category"
              value={values.categoryId}
              onChange={(event) =>
                setField("categoryId", event.target.value)
              }
              aria-invalid={Boolean(fieldErrors.categoryId)}
            >
              <option value="">Selecciona una categoría…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            {fieldErrors.categoryId ? (
              <FieldError>{fieldErrors.categoryId}</FieldError>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className={LEGEND_CLASS}>Precio</legend>
          <div>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted"
              >
                $
              </span>
              <Input
                id="product-price"
                type="text"
                inputMode="decimal"
                aria-label="Precio"
                value={values.price}
                onChange={(event) => setField("price", event.target.value)}
                placeholder="0.00"
                aria-invalid={Boolean(fieldErrors.price)}
                className="pl-7"
              />
            </div>
            {fieldErrors.price ? (
              <FieldError>{fieldErrors.price}</FieldError>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className={LEGEND_CLASS}>Inventario</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="product-stock">Stock</FieldLabel>
              <Input
                id="product-stock"
                type="text"
                inputMode="numeric"
                value={values.stock}
                onChange={(event) => setField("stock", event.target.value)}
                placeholder="0"
                aria-invalid={Boolean(fieldErrors.stock)}
              />
              {fieldErrors.stock ? (
                <FieldError>{fieldErrors.stock}</FieldError>
              ) : null}
            </div>
            <div>
              <FieldLabel htmlFor="product-threshold">
                Umbral de stock bajo
              </FieldLabel>
              <Input
                id="product-threshold"
                type="text"
                inputMode="numeric"
                value={values.lowStockThreshold}
                onChange={(event) =>
                  setField("lowStockThreshold", event.target.value)
                }
                placeholder={String(DEFAULT_LOW_STOCK_THRESHOLD)}
                aria-invalid={Boolean(fieldErrors.lowStockThreshold)}
              />
              {fieldErrors.lowStockThreshold ? (
                <FieldError>{fieldErrors.lowStockThreshold}</FieldError>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-muted">
            El indicador de stock bajo se muestra cuando el stock es menor o
            igual al umbral.
          </p>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className={LEGEND_CLASS}>Estado</legend>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) =>
                setField("isActive", event.target.checked)
              }
              className={CHECKBOX_CLASS}
            />
            Activo
            <span className="text-muted">
              (visible en el catálogo público)
            </span>
          </label>
        </fieldset>

        <ProductImageField
          currentUrl={currentImageUrl}
          onFileChange={setImage}
          onRemove={isEdit ? handleDeleteImage : undefined}
          removePending={deleteImagePending}
          disabled={pending}
        />

        {submitError ? (
          <p role="alert" className="text-sm text-danger-strong">
            {submitError}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}