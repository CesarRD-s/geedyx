'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Check,
  Globe2,
  LoaderCircle,
  MapPin,
  Pencil,
  Save,
  Settings2,
  TriangleAlert,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AuthSession, CompanyConfiguration } from '@geedyx/contracts';
import {
  FeedbackAlert,
  Modal,
  useToast,
} from '../../../../../components/feedback/feedback';
import { Input } from '../../../../../components/forms/input';
import { PageHeader } from '../../../../../components/layout/page-header';
import {
  ApiClientError,
  getConfiguration,
  getCurrentSession,
  updateConfiguration,
} from '../../../../../lib/api-client';
import { cn } from '../../../../../lib/cn';

const configurationSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre del negocio.').max(160),
  country: z.string().trim().min(1, 'Indica el país o región.').max(120),
  timeZone: z.string().trim().min(1, 'Indica la zona horaria.').max(100),
  currency: z.string().trim().length(3, 'Usa un código de moneda de 3 letras.'),
  locale: z.enum(['es', 'en']),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  timeFormat: z.enum(['12', '24']),
  logoUrl: z.string().trim().url('Escribe una URL válida.').or(z.literal('')),
});

type ConfigurationFormValues = z.infer<typeof configurationSchema>;

const sessionQueryKey = ['auth', 'session'];
const configurationQueryKey = ['configuration'];

function toFormValues(configuration: CompanyConfiguration): ConfigurationFormValues {
  return {
    name: configuration.name === 'Por configurar' ? '' : configuration.name,
    country: configuration.country ?? '',
    timeZone: configuration.timeZone ?? '',
    currency: configuration.currency ?? '',
    locale: configuration.locale === 'en' ? 'en' : 'es',
    dateFormat: configuration.dateFormat as ConfigurationFormValues['dateFormat'],
    timeFormat: configuration.timeFormat === '12' ? '12' : '24',
    logoUrl: configuration.logoUrl ?? '',
  };
}

export default function CompanyConfigurationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const sessionQuery = useQuery<AuthSession, ApiClientError>({
    queryFn: getCurrentSession,
    queryKey: sessionQueryKey,
  });
  const canRead = Boolean(
    sessionQuery.data?.user.permissions.includes('configuration.read'),
  );
  const canUpdate = Boolean(
    sessionQuery.data?.user.permissions.includes('configuration.update'),
  );
  const configurationQuery = useQuery<CompanyConfiguration, ApiClientError>({
    enabled: canRead,
    queryFn: getConfiguration,
    queryKey: configurationQueryKey,
  });
  const updateMutation = useMutation({
    mutationFn: updateConfiguration,
    onSuccess: (configuration) => {
      queryClient.setQueryData(configurationQueryKey, configuration);
      setEditOpen(false);
      notify({
        message: 'La configuración general se actualizó correctamente.',
        title: 'Configuración guardada',
        tone: 'success',
      });
    },
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ConfigurationFormValues>({
    defaultValues: {
      country: '',
      currency: '',
      dateFormat: 'DD/MM/YYYY',
      locale: 'es',
      logoUrl: '',
      name: '',
      timeFormat: '24',
      timeZone: '',
    },
    resolver: zodResolver(configurationSchema),
  });

  useEffect(() => {
    if (sessionQuery.error?.status === 401) router.replace('/login');
  }, [router, sessionQuery.error]);

  useEffect(() => {
    if (configurationQuery.data) reset(toFormValues(configurationQuery.data));
  }, [configurationQuery.data, reset]);

  const openEditor = () => {
    setFormError('');
    updateMutation.reset();
    if (configurationQuery.data) reset(toFormValues(configurationQuery.data));
    setEditOpen(true);
  };

  const onSubmit: SubmitHandler<ConfigurationFormValues> = async (values) => {
    setFormError('');
    updateMutation.reset();
    try {
      await updateMutation.mutateAsync({
        ...values,
        logoUrl: values.logoUrl || null,
      });
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : 'No pudimos guardar la configuración. Inténtalo de nuevo.',
      );
    }
  };

  if (sessionQuery.isPending || configurationQuery.isPending) {
    return <p className={cn(['text-sm text-secondary'])}>Cargando configuración…</p>;
  }

  if (!sessionQuery.data || !canRead) {
    return (
      <FeedbackAlert tone="error">
        No tienes permiso para consultar esta configuración.
      </FeedbackAlert>
    );
  }

  if (configurationQuery.isError || !configurationQuery.data) {
    return (
      <FeedbackAlert tone="error" title="No pudimos cargar la configuración">
        Inténtalo de nuevo para recuperar los datos de la empresa.
      </FeedbackAlert>
    );
  }

  const configuration = configurationQuery.data;

  return (
    <div className={cn(['space-y-6'])}>
      <PageHeader
        actions={
          canUpdate ? (
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
              Editar
            </button>
          ) : null
        }
        eyebrow="Configuración"
        title="Empresa"
      />

      {!configuration.isComplete ? (
        <FeedbackAlert tone="warning">
          Completa los campos obligatorios para activar todos los formatos del sistema.
        </FeedbackAlert>
      ) : null}

      <section
        className={cn([
          'rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6',
        ])}
      >
        <div className={cn(['flex flex-wrap items-start justify-between gap-5'])}>
          <div className={cn(['flex min-w-0 items-start gap-4'])}>
            <div
              className={cn([
                'grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-muted',
                'text-accent',
              ])}
            >
              <Building2 aria-hidden="true" className={cn(['h-7 w-7'])} />
            </div>
            <div className={cn(['min-w-0 space-y-1'])}>
              <p
                className={cn([
                  'text-xs font-medium uppercase tracking-wide text-muted',
                ])}
              >
                Identidad del negocio
              </p>
              <h2 className={cn(['truncate text-xl font-semibold'])}>
                {configuration.name}
              </h2>
              <p className={cn(['text-sm text-secondary'])}>
                {configuration.country ?? 'País pendiente'}
              </p>
            </div>
          </div>
          <span
            className={cn([
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
              configuration.isComplete
                ? 'bg-success/10 text-success-strong'
                : 'bg-warning/10 text-warning-strong',
            ])}
          >
            {configuration.isComplete ? (
              <Check aria-hidden="true" className={cn(['h-4 w-4'])} />
            ) : (
              <TriangleAlert aria-hidden="true" className={cn(['h-4 w-4'])} />
            )}
            {configuration.isComplete ? 'Lista para usar' : 'Requiere atención'}
          </span>
        </div>
      </section>

      <div className={cn(['grid gap-5 md:grid-cols-2 xl:grid-cols-3'])}>
        <SummaryCard
          icon={<Building2 aria-hidden="true" className={cn(['h-5 w-5'])} />}
          items={[
            ['Nombre visible', configuration.name],
            ['Logo', configuration.logoUrl ? 'Configurado' : 'Sin logo'],
          ]}
          title="Identidad"
        />
        <SummaryCard
          icon={<MapPin aria-hidden="true" className={cn(['h-5 w-5'])} />}
          items={[
            ['País o región', configuration.country ?? 'Pendiente'],
            ['Zona horaria', configuration.timeZone ?? 'Pendiente'],
            ['Moneda', configuration.currency ?? 'Pendiente'],
          ]}
          title="Regionalización"
        />
        <SummaryCard
          icon={<Globe2 aria-hidden="true" className={cn(['h-5 w-5'])} />}
          items={[
            ['Idioma', configuration.locale === 'en' ? 'English' : 'Español'],
            ['Fecha', configuration.dateFormat],
            ['Hora', configuration.timeFormat === '12' ? '12 horas' : '24 horas'],
          ]}
          title="Formatos"
        />
      </div>

      <section
        className={cn([
          'flex items-start gap-3 rounded-2xl border border-dashed border-border-strong',
          'bg-surface-subtle p-5',
        ])}
      >
        <div className={cn(['flex items-start gap-3'])}>
          <Settings2
            aria-hidden="true"
            className={cn(['mt-0.5 h-5 w-5 text-accent'])}
          />
          <div className={cn(['space-y-1'])}>
            <p className={cn(['text-sm text-secondary'])}>
              Estos valores se aplican a las nuevas operaciones y documentos.
            </p>
          </div>
        </div>
      </section>

      <Modal
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
                'inline-flex items-center justify-center gap-2 rounded-full bg-accent px-3 py-2',
                'text-sm font-medium text-accent-foreground transition hover:bg-accent-hover',
                'disabled:cursor-not-allowed disabled:opacity-60',
              ])}
              disabled={updateMutation.isPending}
              form="company-configuration-form"
              type="submit"
            >
              {updateMutation.isPending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className={cn(['h-4 w-4 animate-spin'])}
                />
              ) : (
                <Save aria-hidden="true" className={cn(['h-4 w-4'])} />
              )}
              {updateMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        }
        onClose={() => setEditOpen(false)}
        open={editOpen}
        size="xl"
        title="Editar configuración de empresa"
      >
        <form
          aria-busy={updateMutation.isPending}
          className={cn(['space-y-6'])}
          id="company-configuration-form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className={cn(['grid gap-5 sm:grid-cols-2 lg:grid-cols-3'])}>
            <div className={cn(['sm:col-span-2 lg:col-span-3'])}>
              <FormSectionHeading
                description="La identidad se mostrará en la consola y en los documentos."
                title="Identidad"
              />
            </div>
            <Field
              error={errors.name?.message}
              label="Nombre del negocio"
              name="company-name"
            >
              <Input id="company-name" {...register('name')} />
            </Field>
            <Field
              error={errors.country?.message}
              label="País o región"
              name="company-country"
            >
              <Input id="company-country" {...register('country')} />
            </Field>
            <Field
              error={errors.logoUrl?.message}
              label="Logo (URL opcional)"
              name="company-logo"
            >
              <Input id="company-logo" type="url" {...register('logoUrl')} />
            </Field>

            <div className={cn(['sm:col-span-2 lg:col-span-3'])}>
              <FormSectionHeading
                description="Se usan para precios, fechas y horas en la experiencia del equipo."
                title="Regionalización"
              />
            </div>
            <Field
              error={errors.timeZone?.message}
              label="Zona horaria"
              name="company-time-zone"
            >
              <Input
                id="company-time-zone"
                placeholder="America/Tegucigalpa"
                {...register('timeZone')}
              />
            </Field>
            <Field
              error={errors.currency?.message}
              label="Moneda"
              name="company-currency"
            >
              <Input
                id="company-currency"
                maxLength={3}
                placeholder="HNL"
                {...register('currency')}
              />
            </Field>
            <Field
              error={errors.locale?.message}
              label="Idioma predeterminado"
              name="company-locale"
            >
              <select
                className={selectStyles}
                id="company-locale"
                {...register('locale')}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field
              error={errors.dateFormat?.message}
              label="Formato de fecha"
              name="company-date-format"
            >
              <select
                className={selectStyles}
                id="company-date-format"
                {...register('dateFormat')}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </Field>
            <Field
              error={errors.timeFormat?.message}
              label="Formato de hora"
              name="company-time-format"
            >
              <select
                className={selectStyles}
                id="company-time-format"
                {...register('timeFormat')}
              >
                <option value="24">24 horas</option>
                <option value="12">12 horas</option>
              </select>
            </Field>
          </div>
          {formError ? <FeedbackAlert tone="error">{formError}</FeedbackAlert> : null}
        </form>
      </Modal>
    </div>
  );
}

function FormSectionHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className={cn(['border-b border-border pb-3'])}>
      <h3 className={cn(['font-medium'])}>{title}</h3>
      <p className={cn(['mt-1 text-sm text-secondary'])}>{description}</p>
    </div>
  );
}

function SummaryCard({
  icon,
  items,
  title,
}: {
  icon: React.ReactNode;
  items: Array<[string, string]>;
  title: string;
}) {
  return (
    <section
      className={cn([
        'space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm',
      ])}
    >
      <div className={cn(['flex items-center gap-3'])}>
        <span className={cn(['text-accent'])}>{icon}</span>
        <h2 className={cn(['font-semibold'])}>{title}</h2>
      </div>
      <dl className={cn(['space-y-3'])}>
        {items.map(([label, value]) => (
          <div className={cn(['flex items-start justify-between gap-4'])} key={label}>
            <dt className={cn(['text-sm text-secondary'])}>{label}</dt>
            <dd
              className={cn(['max-w-[60%] break-words text-right text-sm font-medium'])}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const selectStyles = cn([
  'w-full rounded-xl border border-input-border bg-input px-3 py-2.5 text-sm',
  'text-foreground focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20',
]);

function Field({
  children,
  error,
  label,
  name,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
  name: string;
}) {
  return (
    <div className={cn(['space-y-1.5'])}>
      <label className={cn(['text-sm font-medium'])} htmlFor={name}>
        {label}
      </label>
      {children}
      {error ? <p className={cn(['text-xs text-danger'])}>{error}</p> : null}
    </div>
  );
}
