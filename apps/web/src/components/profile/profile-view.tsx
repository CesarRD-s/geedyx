"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getCurrentUser, updateProfile } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";

export function ProfileView() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void getCurrentUser()
      .then(setUser)
      .catch(() => setError("No se pudo cargar tu perfil."));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      setUser(
        await updateProfile({
          displayName: user.displayName ?? "",
          locale: user.locale as "es" | "en",
          timeZone: user.timeZone,
        }),
      );
      setSaved(true);
    } catch {
      setError("No se pudo guardar tu perfil.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="space-y-6">
      <PageHeader
        title="Mi perfil"
        description="Administra tus preferencias personales."
      />
      {user ? (
        <form
          onSubmit={submit}
          className="grid gap-4 md:grid-cols-2"
          aria-busy={saving}
        >
          <div className="md:col-span-2">
            <FieldLabel htmlFor="profile-name">Nombre visible</FieldLabel>
            <Input
              id="profile-name"
              value={user.displayName ?? ""}
              placeholder={user.username}
              onChange={(event) =>
                setUser({ ...user, displayName: event.target.value || null })
              }
            />
          </div>
          <div>
            <FieldLabel htmlFor="profile-locale">Idioma</FieldLabel>
            <Select
              id="profile-locale"
              value={user.locale}
              onChange={(event) =>
                setUser({ ...user, locale: event.target.value })
              }
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="profile-zone">Zona horaria</FieldLabel>
            <Select
              id="profile-zone"
              value={user.timeZone}
              onChange={(event) =>
                setUser({ ...user, timeZone: event.target.value })
              }
            >
              <option value="UTC">UTC</option>
              <option value="America/Tegucigalpa">America/Tegucigalpa</option>
              <option value="America/Mexico_City">America/Mexico_City</option>
              <option value="America/Bogota">America/Bogota</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button
              type="submit"
              loading={saving}
              loadingLabel="Guardando perfil"
            >
              Guardar perfil
            </Button>
          </div>
        </form>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
      {saved ? (
        <p role="status" className="text-sm text-success-strong">
          Perfil guardado.
        </p>
      ) : null}
    </section>
  );
}
