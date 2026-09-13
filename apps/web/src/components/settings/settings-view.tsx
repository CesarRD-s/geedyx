"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getCompanySettings, updateCompanySettings } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/http";
import type { CompanySettings } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";

const emptySettings: CompanySettings = {
  name: null,
  locale: null,
  timeZone: null,
  currency: null,
  configuredAt: null,
};

export function SettingsView() {
  const [settings, setSettings] = useState<CompanySettings>(emptySettings);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    void getCompanySettings()
      .then((value) => {
        if (active) {
          setSettings(value);
        }
      })
      .catch(() => {
        if (active) {
          setError("No se pudieron cargar los ajustes.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const updated = await updateCompanySettings({
        name: settings.name ?? undefined,
        locale: settings.locale ?? undefined,
        timeZone: settings.timeZone ?? undefined,
        currency: settings.currency ?? undefined,
      });
      setSettings(updated);
      setSaved(true);
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Ajustes"
        description="Completa estos datos cuando estés listo. Los campos pendientes no bloquean el uso del sistema."
      />

      <form
        onSubmit={submit}
        className="grid gap-4 md:grid-cols-2"
        aria-busy={saving}
      >
        <div className="md:col-span-2">
          <FieldLabel htmlFor="company-name">Nombre de empresa</FieldLabel>
          <Input
            id="company-name"
            value={settings.name ?? ""}
            placeholder="Pendiente"
            onChange={(event) =>
              setSettings({ ...settings, name: event.target.value || null })
            }
          />
        </div>
        <div>
          <FieldLabel htmlFor="company-locale">
            Idioma predeterminado
          </FieldLabel>
          <Select
            id="company-locale"
            value={settings.locale ?? ""}
            onChange={(event) =>
              setSettings({
                ...settings,
                locale: (event.target.value ||
                  null) as CompanySettings["locale"],
              })
            }
          >
            <option value="">Pendiente</option>
            <option value="es">Español</option>
            <option value="en">English</option>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="company-zone">Zona horaria</FieldLabel>
          <Select
            id="company-zone"
            value={settings.timeZone ?? ""}
            onChange={(event) =>
              setSettings({ ...settings, timeZone: event.target.value || null })
            }
          >
            <option value="">Pendiente</option>
            <option value="America/Tegucigalpa">America/Tegucigalpa</option>
            <option value="America/Mexico_City">America/Mexico_City</option>
            <option value="America/Bogota">America/Bogota</option>
            <option value="UTC">UTC</option>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="company-currency">Moneda base</FieldLabel>
          <Select
            id="company-currency"
            value={settings.currency ?? ""}
            onChange={(event) =>
              setSettings({
                ...settings,
                currency: (event.target.value ||
                  null) as CompanySettings["currency"],
              })
            }
          >
            <option value="">Pendiente</option>
            <option value="HNL">HNL</option>
            <option value="USD">USD</option>
            <option value="MXN">MXN</option>
            <option value="COP">COP</option>
            <option value="EUR">EUR</option>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Button
            type="submit"
            loading={saving}
            loadingLabel="Guardando ajustes"
          >
            Guardar ajustes
          </Button>
        </div>
      </form>

      {error ? <FieldError>{error}</FieldError> : null}
      {saved ? (
        <p role="status" className="text-sm text-success-strong">
          Ajustes guardados.
        </p>
      ) : null}
    </section>
  );
}
