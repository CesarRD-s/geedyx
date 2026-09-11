"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_IMAGE_SIZE_BYTES, productImageUrl } from "@/lib/products/format";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import {
  fieldLabelClass,
  helperTextXsClass,
} from "@/components/ui/styles";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const FILE_INPUT_CLASS =
  "block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground file:hover:bg-surface-subtle";

interface ProductImageFieldProps {
  currentUrl: string | null;
  onFileChange: (file: File | null) => void;
  onRemove?: () => void;
  removePending?: boolean;
  disabled?: boolean;
}

export function ProductImageField({
  currentUrl,
  onFileChange,
  onRemove,
  removePending,
  disabled,
}: ProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewUrl) {
      return;
    }
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function selectFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("La imagen debe ser JPEG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("La imagen no puede superar los 5 MB.");
      return;
    }
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    onFileChange(file);
  }

  function clearSelection() {
    setSelectedFile(null);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setError(null);
    onFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const displayUrl = previewUrl ?? (currentUrl ? productImageUrl(currentUrl) : null);

  return (
    <div>
      <span className={fieldLabelClass}>Imagen</span>
      <div className="flex items-start gap-4">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Vista previa del producto"
            className="h-20 w-20 rounded-md border border-border object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border-strong bg-surface-subtle text-xs text-muted">
            Sin imagen
          </div>
        )}
        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                selectFile(file);
              }
            }}
            disabled={disabled}
            aria-label="Seleccionar imagen del producto"
            className={FILE_INPUT_CLASS}
          />
          <p className={helperTextXsClass}>JPEG, PNG o WebP. Máximo 5 MB.</p>
          <div className="flex flex-wrap gap-2">
            {selectedFile ? (
              <Button
                variant="secondary"
                onClick={clearSelection}
                disabled={disabled}
              >
                Quitar imagen seleccionada
              </Button>
            ) : null}
            {!selectedFile && currentUrl && onRemove ? (
              <Button
                variant="danger"
                onClick={onRemove}
                disabled={disabled || removePending}
                loading={removePending}
                loadingLabel="Eliminando…"
              >
                Eliminar imagen
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {error ? (
        <div className="mt-2">
          <FieldError>{error}</FieldError>
        </div>
      ) : null}
    </div>
  );
}