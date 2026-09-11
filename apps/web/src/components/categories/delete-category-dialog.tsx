"use client";

import { useState } from "react";
import { ApiError, apiErrorMessage } from "@/lib/api/http";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

interface DeleteCategoryDialogProps {
  categoryName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DeleteCategoryDialog({
  categoryName,
  onConfirm,
  onClose,
}: DeleteCategoryDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    setSubmitError(null);
    try {
      await onConfirm();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setSubmitError(
          "La categoría no puede eliminarse porque tiene productos asociados.",
        );
      } else {
        setSubmitError(apiErrorMessage(error));
      }
      setPending(false);
    }
  }

  return (
    <Dialog
      title="Eliminar categoría"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={pending}
            loadingLabel="Eliminando…"
            disabled={pending}
            onClick={handleConfirm}
          >
            Eliminar
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">
        La categoría{" "}
        <span className="font-medium text-foreground">“{categoryName}”</span> se
        eliminará. Esta acción no se puede deshacer.
      </p>
      {submitError ? (
        <FieldError>{submitError}</FieldError>
      ) : null}
    </Dialog>
  );
}