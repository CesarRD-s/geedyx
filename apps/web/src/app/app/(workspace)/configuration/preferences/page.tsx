'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Globe2, LoaderCircle, Pencil, Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AuthSession, UserPreferences } from '@geedyx/contracts';
import {
  FeedbackAlert,
  Modal,
  useToast,
} from '../../../../../components/feedback/feedback';
import { Input } from '../../../../../components/forms/input';
import { PageHeader } from '../../../../../components/layout/page-header';
import {
  ApiClientError,
  getCurrentSession,
  getPreferences,
  updatePreferences,
} from '../../../../../lib/api-client';
import { cn } from '../../../../../lib/cn';

const sessionQueryKey = ['auth', 'session'];
const preferencesQueryKey = ['preferences'];

function languageLabel(language: 'es' | 'en'): string {
  return language === 'en' ? 'English' : 'Español';
}

function timeZoneLabel(timeZone: string | null): string {
  return timeZone ?? 'Zona horaria del navegador';
}

export default function PreferencesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [language, setLanguage] = useState<'' | 'es' | 'en'>('');
  const [timeZone, setTimeZone] = useState('');
  const [formError, setFormError] = useState('');
  const sessionQuery = useQuery<AuthSession, ApiClientError>({
    queryFn: getCurrentSession,
    queryKey: sessionQueryKey,
  });
  const canRead = Boolean(
    sessionQuery.data?.user.permissions.includes('configuration.read'),
  );
  const preferencesQuery = useQuery<UserPreferences, ApiClientError>({
    enabled: canRead,
    queryFn: getPreferences,
    queryKey: preferencesQueryKey,
  });
  const updateMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: (result) => {
      queryClient.setQueryData(preferencesQueryKey, result);
      queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      setEditOpen(false);
      notify({
        message: 'La sesión se actualizará automáticamente con estos valores.',
        title: 'Preferencias guardadas',
        tone: 'success',
      });
    },
  });

  useEffect(() => {
    if (sessionQuery.error?.status === 401) router.replace('/login');
  }, [router, sessionQuery.error]);

  const openEditor = () => {
    if (!preferencesQuery.data) return;
    setLanguage(preferencesQuery.data.language ?? '');
    setTimeZone(preferencesQuery.data.timeZone ?? '');
    setFormError('');
    updateMutation.reset();
    setEditOpen(true);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    updateMutation.mutate(
      {
        language: language || null,
        timeZone: timeZone.trim() || null,
      },
      {
        onError: (error) => {
          setFormError(
            error instanceof ApiClientError
              ? error.message
              : 'No pudimos guardar tus preferencias.',
          );
        },
      },
    );
  };

  if (sessionQuery.isPending || preferencesQuery.isPending) {
    return <p className={cn(['text-sm text-secondary'])}>Cargando preferencias…</p>;
  }
  if (!sessionQuery.data || !canRead) {
    return (
      <FeedbackAlert tone="error">
        No tienes permiso para consultar tus preferencias.
      </FeedbackAlert>
    );
  }
  if (preferencesQuery.isError || !preferencesQuery.data) {
    return (
      <FeedbackAlert tone="error">No pudimos cargar tus preferencias.</FeedbackAlert>
    );
  }

  const preferences = preferencesQuery.data;

  return (
    <div className={cn(['space-y-6'])}>
      <PageHeader
        actions={
          <button
            className={cn([
              'inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2',
              'text-sm font-medium text-accent-foreground transition hover:bg-accent-hover',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30',
            ])}
            onClick={openEditor}
            type="button"
          >
            <Pencil aria-hidden="true" className={cn(['h-4 w-4'])} />
            Editar preferencias
          </button>
        }
        description="Define cómo quieres ver el idioma y las fechas en tu espacio de trabajo."
        eyebrow="Configuración"
        title="Preferencias"
      />

      <section
        className={cn([
          'grid gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm md:grid-cols-2',
        ])}
      >
        <div className={cn(['rounded-xl border border-border bg-surface-subtle p-5'])}>
          <div className={cn(['flex items-start justify-between gap-3'])}>
            <div>
              <p
                className={cn([
                  'text-xs font-medium uppercase tracking-wide text-muted',
                ])}
              >
                Idioma de la interfaz
              </p>
              <p className={cn(['mt-2 text-lg font-semibold'])}>
                {languageLabel(preferences.effectiveLanguage)}
              </p>
            </div>
            <Globe2 aria-hidden="true" className={cn(['h-5 w-5 text-accent'])} />
          </div>
          <p className={cn(['mt-3 text-sm text-secondary'])}>
            {preferences.language === null
              ? `Heredado de la empresa: ${languageLabel(preferences.companyLanguage)}.`
              : 'Configurado solo para tu usuario.'}
          </p>
        </div>
        <div className={cn(['rounded-xl border border-border bg-surface-subtle p-5'])}>
          <div className={cn(['flex items-start justify-between gap-3'])}>
            <div>
              <p
                className={cn([
                  'text-xs font-medium uppercase tracking-wide text-muted',
                ])}
              >
                Zona horaria
              </p>
              <p className={cn(['mt-2 text-lg font-semibold'])}>
                {timeZoneLabel(preferences.effectiveTimeZone)}
              </p>
            </div>
            <Settings2 aria-hidden="true" className={cn(['h-5 w-5 text-accent'])} />
          </div>
          <p className={cn(['mt-3 text-sm text-secondary'])}>
            {preferences.timeZone === null
              ? `Heredada de la empresa: ${timeZoneLabel(preferences.companyTimeZone)}.`
              : 'Configurada solo para tu usuario.'}
          </p>
        </div>
      </section>

      <FeedbackAlert title="Preferencias personales">
        Los campos vacíos vuelven a usar la configuración general de la empresa.
      </FeedbackAlert>

      <Modal
        description="Estas opciones afectan tu sesión y la forma en que se muestran las fechas."
        footer={
          <>
            <button
              className={cn([
                'rounded-full border border-border-strong px-3 py-2 text-sm font-medium',
                'transition hover:bg-surface-subtle',
              ])}
              onClick={() => setEditOpen(false)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className={cn([
                'inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2',
                'text-sm font-medium text-accent-foreground transition hover:bg-accent-hover',
                'disabled:cursor-not-allowed disabled:opacity-60',
              ])}
              disabled={updateMutation.isPending}
              form="preferences-form"
              type="submit"
            >
              {updateMutation.isPending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className={cn(['h-4 w-4 animate-spin'])}
                />
              ) : (
                <Check aria-hidden="true" className={cn(['h-4 w-4'])} />
              )}
              {updateMutation.isPending ? 'Guardando…' : 'Guardar preferencias'}
            </button>
          </>
        }
        onClose={() => setEditOpen(false)}
        open={editOpen}
        size="lg"
        title="Editar preferencias"
      >
        <form
          className={cn(['grid gap-5 sm:grid-cols-2'])}
          id="preferences-form"
          onSubmit={submit}
        >
          <div className={cn(['space-y-1.5'])}>
            <label
              className={cn(['text-sm font-medium'])}
              htmlFor="preferences-language"
            >
              Idioma
            </label>
            <select
              className={selectStyles}
              id="preferences-language"
              onChange={(event) => setLanguage(event.target.value as typeof language)}
              value={language}
            >
              <option value="">Usar idioma de la empresa</option>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className={cn(['space-y-1.5'])}>
            <label
              className={cn(['text-sm font-medium'])}
              htmlFor="preferences-time-zone"
            >
              Zona horaria
            </label>
            <Input
              id="preferences-time-zone"
              onChange={(event) => setTimeZone(event.target.value)}
              placeholder="America/Tegucigalpa"
              value={timeZone}
            />
            <p className={cn(['text-xs text-muted'])}>
              Usa una zona IANA, por ejemplo America/Tegucigalpa.
            </p>
          </div>
          {formError ? (
            <div className={cn(['sm:col-span-2'])}>
              <FeedbackAlert tone="error">{formError}</FeedbackAlert>
            </div>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}

const selectStyles = cn([
  'w-full rounded-xl border border-input-border bg-input px-3 py-2.5 text-sm',
  'text-foreground focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20',
]);
