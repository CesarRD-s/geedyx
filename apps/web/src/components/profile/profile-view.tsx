"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getCurrentUser,
  requestEmailChange,
  updateProfile,
} from "@/lib/api/client";
import { ApiError } from "@/lib/api/http";
import type { AuthUser } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { useTranslations } from "@/components/preferences/translation-context";
import { ReauthenticationDialog } from "@/components/security/reauthentication-dialog";

export function ProfileView() {
  const t = useTranslations();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPending, setEmailPending] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [needsReauthentication, setNeedsReauthentication] = useState(false);
  useEffect(() => {
    void getCurrentUser()
      .then(setUser)
      .catch(() => setError(t("profile.loadError")));
  }, [t]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      setUser(await updateProfile({ displayName: user.displayName ?? "" }));
      setSaved(true);
    } catch {
      setError(t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function submitEmailChange(): Promise<void> {
    if (!newEmail.trim()) {
      setEmailMessage("Ingresa el nuevo correo electrónico.");
      return;
    }
    setEmailPending(true);
    setEmailMessage(null);
    try {
      const delivered = await requestEmailChange(newEmail.trim());
      setNewEmail("");
      setEmailMessage(
        delivered
          ? "Enviamos un enlace de confirmación al nuevo correo."
          : "El correo no está configurado en este entorno. No se creó un cambio pendiente.",
      );
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.code === "REAUTHENTICATION_REQUIRED"
      ) {
        setNeedsReauthentication(true);
      } else if (cause instanceof ApiError && cause.status === 409) {
        setEmailMessage("Ese correo ya está en uso.");
      } else {
        setEmailMessage("No se pudo solicitar el cambio de correo.");
      }
    } finally {
      setEmailPending(false);
    }
  }
  return (
    <section className="space-y-6">
      <PageHeader
        title={t("profile.title")}
        description={t("profile.description")}
      />
      {user ? (
        <>
          <form
            onSubmit={submit}
            className="grid gap-4 md:grid-cols-2"
            aria-busy={saving}
          >
            <div className="md:col-span-2">
              <FieldLabel htmlFor="profile-name">
                {t("profile.displayName")}
              </FieldLabel>
              <Input
                id="profile-name"
                value={user.displayName ?? ""}
                placeholder={user.username}
                onChange={(event) =>
                  setUser({ ...user, displayName: event.target.value || null })
                }
              />
            </div>
            <div className="md:col-span-2">
              <Button
                type="submit"
                loading={saving}
                loadingLabel={t("profile.saving")}
              >
                {t("profile.save")}
              </Button>
            </div>
          </form>
          <section className="border-t border-border pt-5">
            <h2 className="text-base font-medium text-foreground">
              Correo electrónico
            </h2>
            <p className="mt-1 text-sm text-secondary">Actual: {user.email}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <FieldLabel htmlFor="profile-email">Nuevo correo</FieldLabel>
                <Input
                  id="profile-email"
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  autoComplete="email"
                  disabled={emailPending}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void submitEmailChange()}
                loading={emailPending}
                loadingLabel="Enviando…"
              >
                Enviar confirmación
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Confirmar el enlace cerrará todas tus sesiones por seguridad.
            </p>
            {emailMessage ? <p role="status" className="mt-2 text-sm text-secondary">{emailMessage}</p> : null}
          </section>
        </>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
      {saved ? (
        <p role="status" className="text-sm text-success-strong">
          {t("profile.saved")}
        </p>
      ) : null}
      {needsReauthentication ? (
        <ReauthenticationDialog
          onClose={() => setNeedsReauthentication(false)}
          onAuthenticated={async () => {
            setNeedsReauthentication(false);
            await submitEmailChange();
          }}
        />
      ) : null}
    </section>
  );
}
