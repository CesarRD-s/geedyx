"use client";

import { useRef, useState, type FormEvent } from "react";
import { ApiError, apiErrorMessage } from "@/lib/api/http";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";
import { helperTextClass } from "@/components/ui/styles";

const NAME_MAX_LENGTH = 80;

interface CategoryFormDialogProps {
  mode: "create" | "edit";
  categoryName?: string;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
}

export function CategoryFormDialog({
  mode,
  categoryName,
  onSave,
  onClose,
}: CategoryFormDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(categoryName ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isEdit = mode === "edit";

  function handleInputChange(value: string) {
    setName(value);
    if (validationError) {
      setValidationError(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const clean = name.trim();
    if (!clean) {
      setValidationError("El nombre es obligatorio.");
      return;
    }
    if (clean.length > NAME_MAX_LENGTH) {
      setValidationError(
        `El nombre no puede superar los ${NAME_MAX_LENGTH} caracteres.`,
      );
      return;
    }

    setPending(true);
    setSubmitError(null);
    try {
      await onSave(clean);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setSubmitError("Ya existe una categoría con ese nombre.");
      } else {
        setSubmitError(apiErrorMessage(error));
      }
      setPending(false);
    }
  }

  const errorMessage = validationError ?? submitError;

  return (
    <Dialog
      title={isEdit ? "Editar categoría" : "Nueva categoría"}
      onClose={onClose}
      initialFocusRef={inputRef}
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
            form="category-form"
            variant="primary"
            loading={pending}
            loadingLabel="Guardando…"
            disabled={pending}
          >
            {isEdit ? "Guardar cambios" : "Crear categoría"}
          </Button>
        </>
      }
    >
      <form
        id="category-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        <div>
          <FieldLabel htmlFor="category-name">Nombre</FieldLabel>
          <Input
            ref={inputRef}
            id="category-name"
            type="text"
            value={name}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder="Ej. Electrónica"
            maxLength={NAME_MAX_LENGTH}
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? "category-name-error" : undefined}
          />
          {errorMessage ? (
            <FieldError id="category-name-error">{errorMessage}</FieldError>
          ) : null}
        </div>
        <p className={helperTextClass}>
          El slug (identificador en la URL) se genera automáticamente.
        </p>
      </form>
    </Dialog>
  );
}