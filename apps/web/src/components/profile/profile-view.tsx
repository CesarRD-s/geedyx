"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getCurrentUser, updateProfile } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { useTranslations } from "@/components/preferences/translation-context";

export function ProfileView() {
  const t = useTranslations();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
  return (
    <section className="space-y-6">
      <PageHeader
        title={t("profile.title")}
        description={t("profile.description")}
      />
      {user ? (
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
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
      {saved ? (
        <p role="status" className="text-sm text-success-strong">
          {t("profile.saved")}
        </p>
      ) : null}
    </section>
  );
}
