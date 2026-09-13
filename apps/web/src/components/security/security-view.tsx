"use client";

import { useRegionalContext } from "@/components/preferences/regional-context";
import { useEffect, useState, type FormEvent } from "react";
import {
  changePassword,
  listSessions,
  revokeOtherSessions,
  revokeSession,
} from "@/lib/api/client";
import type { SessionSummary } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { useTranslations } from "@/components/preferences/translation-context";
import { formatUtcInstant, parseUtcInstant } from "@/lib/temporal/instant";

export function SecurityView() {
  const regional = useRegionalContext();
  const t = useTranslations();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function refresh(): Promise<void> {
    setSessions(await listSessions());
  }
  useEffect(() => {
    let active = true;
    void listSessions()
      .then((value) => {
        if (active) setSessions(value);
      })
      .catch(() => {
        if (active) setError(t("security.loadError"));
      });
    return () => {
      active = false;
    };
  }, [t]);

  async function handlePassword(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t("security.mismatch"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await changePassword({ currentPassword, newPassword });
      setChangeOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(t("security.updated"));
      await refresh();
    } catch {
      setError(t("security.updateError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("security.title")}
        description={t("security.description")}
        action={
          <Button
            onClick={() => {
              setError(null);
              setChangeOpen(true);
            }}
          >
            {t("security.changePassword")}
          </Button>
        }
      />
      {message ? (
        <p role="status" className="text-sm text-success-strong">
          {message}
        </p>
      ) : null}
      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-foreground">
            {t("security.sessions")}
          </h3>
          <Button
            variant="secondary"
            onClick={() => void revokeOtherSessions().then(refresh)}
          >
            {t("security.closeOthers")}
          </Button>
        </div>
        <ul className="divide-y divide-border rounded-md border border-border">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {session.current
                    ? t("security.thisDevice")
                    : (session.userAgent ?? t("security.unknownDevice"))}
                </p>
                <p className="text-xs text-muted">
                  {t("security.lastUsed")}:{" "}
                  {formatSessionInstant(
                    session.lastUsedAt,
                    regional.locale,
                    regional.timeZone,
                  )}
                </p>
              </div>
              {!session.current ? (
                <Button
                  variant="secondary"
                  onClick={() => void revokeSession(session.id).then(refresh)}
                >
                  {t("security.closeSession")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      {changeOpen ? (
        <Dialog
          title={t("security.changePassword")}
          description={t("security.changeDescription")}
          onClose={() => setChangeOpen(false)}
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setChangeOpen(false)}
                disabled={pending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                form="change-password"
                loading={pending}
                loadingLabel={t("security.updating")}
              >
                {t("security.updatePassword")}
              </Button>
            </>
          }
        >
          {changeOpen ? (
            <form
              id="change-password"
              onSubmit={handlePassword}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <FieldLabel htmlFor="current-password">
                  {t("security.currentPassword")}
                </FieldLabel>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="new-password">
                  {t("security.newPassword")}
                </FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="confirm-password">
                  {t("security.confirmPassword")}
                </FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
              </div>
              {error ? (
                <div className="md:col-span-2">
                  <FieldError>{error}</FieldError>
                </div>
              ) : null}
            </form>
          ) : null}
        </Dialog>
      ) : null}
    </section>
  );
}

function formatSessionInstant(
  value: string,
  locale: string,
  timeZone: string,
): string {
  const instant = parseUtcInstant(value);
  return instant ? formatUtcInstant(instant, locale, timeZone) : value;
}
