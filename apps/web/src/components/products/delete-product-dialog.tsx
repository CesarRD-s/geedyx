"use client";

import { useState } from "react";
import { apiErrorMessage } from "@/lib/api/http";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

interface DeleteProductDialogProps {
  productName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DeleteProductDialog({
  productName,
  onConfirm,
  onClose,
}: DeleteProductDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    setSubmitError(null);
    try {
      await onConfirm();
    } catch (error) {
      setSubmitError(apiErrorMessage(error));
      setPending(false);
    }
  }

  return (
    <Dialog
      title="Eliminar producto"
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
        El producto{" "}
        <span className="font-medium text-foreground">“{productName}”</span> se
        eliminará junto con su imagen. Esta acción no se puede deshacer.
      </p>
      {submitError ? <FieldError>{submitError}</FieldError> : null}
    </Dialog>
  );
}