"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getCurrentUser, updateProfile } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { useTranslations } from "./translation-context";

export function PreferencesView() {
  const router = useRouter();
  const t = useTranslations();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void getCurrentUser()
      .then(setUser)
      .catch(() => setError(t("preferences.loadError")));
  }, [t]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      setUser(
        await updateProfile({
          locale: user.locale,
          timeZone: user.timeZone,
        }),
      );
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("preferences.saveError"));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="space-y-6">
      <PageHeader
        title={t("preferences.title")}
        description={t("preferences.description")}
      />
      {user ? (
        <form
          onSubmit={submit}
          className="grid gap-4 md:grid-cols-2"
          aria-busy={saving}
        >
          <div>
            <FieldLabel htmlFor="preference-locale">
              {t("preferences.language")}
            </FieldLabel>
            <Select
              id="preference-locale"
              value={user.locale ?? ""}
              disabled={saving}
              onChange={(event) => {
                setSaved(false);
                setUser({
                  ...user,
                  locale: (event.target.value || null) as "es" | "en" | null,
                });
              }}
            >
              <option value="">{t("preferences.companyLanguage")}</option>
              <option value="es">{t("locale.es")}</option>
              <option value="en">{t("locale.en")}</option>
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="preference-zone">
              {t("preferences.timeZone")}
            </FieldLabel>
            <Select
              id="preference-zone"
              value={user.timeZone ?? ""}
              disabled={saving}
              onChange={(event) => {
                setSaved(false);
                setUser({ ...user, timeZone: event.target.value || null });
              }}
            >
              <option value="">{t("preferences.companyTimeZone")}</option>
              {user.timeZone &&
              ![
                "UTC",
                "America/Tegucigalpa",
                "America/Mexico_City",
                "America/Bogota",
              ].includes(user.timeZone) ? (
                <option value={user.timeZone}>{user.timeZone}</option>
              ) : null}
              <option value="UTC">UTC</option>
              <option value="America/Tegucigalpa">America/Tegucigalpa</option>
              <option value="America/Mexico_City">America/Mexico_City</option>
              <option value="America/Bogota">America/Bogota</option>
            </Select>
          </div>
          <dl className="grid gap-2 text-sm text-secondary md:col-span-2 md:grid-cols-4">
            <div>
              <dt className="text-muted">
                {t("preferences.effectiveLanguage")}
              </dt>
              <dd>{user.regionalContext.locale}</dd>
            </div>
            <div>
              <dt className="text-muted">
                {t("preferences.effectiveTimeZone")}
              </dt>
              <dd>{user.regionalContext.timeZone}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("preferences.companyZone")}</dt>
              <dd>{user.regionalContext.companyTimeZone}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("preferences.currency")}</dt>
              <dd>{user.regionalContext.currency ?? t("common.pending")}</dd>
            </div>
          </dl>
          <div className="md:col-span-2">
            <Button
              type="submit"
              loading={saving}
              loadingLabel={t("preferences.saving")}
            >
              {t("preferences.save")}
            </Button>
          </div>
        </form>
      ) : !error ? (
        <p role="status" className="text-sm text-muted">
          {t("preferences.loading")}
        </p>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
      {saved ? (
        <p role="status" className="text-sm text-success-strong">
          {t("preferences.saved")}
        </p>
      ) : null}
    </section>
  );
}
