"use client";

import { useRef, useState, type FormEvent } from "react";
import { reauthenticate } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";
import { useTranslations } from "@/components/preferences/translation-context";

export function ReauthenticationDialog({
  onAuthenticated,
  onClose,
}: {
  onAuthenticated: () => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await reauthenticate(password);
      await onAuthenticated();
    } catch {
      setError(t("reauth.invalid"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      title={t("reauth.title")}
      description={t("reauth.description")}
      onClose={onClose}
      initialFocusRef={passwordRef}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            form="reauthentication-form"
            loading={pending}
            loadingLabel={t("reauth.confirming")}
          >
            {t("reauth.confirm")}
          </Button>
        </>
      }
    >
      <form id="reauthentication-form" onSubmit={submit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="reauthentication-password">
            {t("security.currentPassword")}
          </FieldLabel>
          <Input
            ref={passwordRef}
            id="reauthentication-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
      </form>
    </Dialog>
  );
}
