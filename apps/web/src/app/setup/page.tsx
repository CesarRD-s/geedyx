'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SetupStatus } from '@geedyx/contracts';
import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { BrandLogo } from '../../components/brand/brand-logo';
import {
  SetupOwnerForm,
  type SetupOwnerFormValues,
} from '../../components/forms/setup-owner-form';
import { ThemeToggle } from '../../components/theme/theme-toggle';
import {
  ApiClientError,
  createOwner,
  getHealthLive,
  getHealthReady,
  getSetupStatus,
} from '../../lib/api-client';
import { cn } from '../../lib/cn';

type SetupCheckKey = 'server' | 'database' | 'installation';
type SetupCheckState = 'waiting' | 'checking' | 'success' | 'error';
type SetupPhase =
  'welcome' | 'checking' | 'ready' | 'form' | 'error' | 'load-error' | 'finishing';

type SetupCheck = {
  checkingDetail: string;
  key: SetupCheckKey;
  label: string;
  successDetail: string;
};

const setupChecks: SetupCheck[] = [
  {
    checkingDetail: 'Estamos comprobando que Geedyx esté disponible.',
    key: 'server',
    label: 'Comprobando el sistema',
    successDetail: 'Geedyx está disponible.',
  },
  {
    checkingDetail: 'Estamos comprobando que la conexión esté lista.',
    key: 'database',
    label: 'Comprobando la conexión',
    successDetail: 'La conexión está lista.',
  },
  {
    checkingDetail: 'Estamos preparando tu instalación.',
    key: 'installation',
    label: 'Preparando la instalación',
    successDetail: 'Ya puedes crear tu cuenta principal.',
  },
];

const checkStartDelay = 900;
const checkResultDelay = 1_200;

function createInitialCheckStates(): Record<SetupCheckKey, SetupCheckState> {
  return {
    database: 'waiting',
    installation: 'waiting',
    server: 'waiting',
  };
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function SetupShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main
      className={cn([
        'min-h-dvh bg-background text-foreground',
        'px-4 py-6',
        'sm:px-6',
      ])}
    >
      <div
        className={cn([
          'mx-auto flex max-w-md flex-col justify-center',
          'min-h-[calc(100dvh-3rem)]',
        ])}
      >
        <div className={cn(['mb-6 flex items-center justify-between gap-4'])}>
          <BrandLogo />
          <ThemeToggle />
        </div>
        {children}
      </div>
    </main>
  );
}

function SetupMessage({
  action,
  children,
}: Readonly<{
  action?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <div
      className={cn(['mt-6 rounded-lg border border-border bg-surface-subtle', 'p-4'])}
    >
      <div className={cn(['space-y-3'])}>
        <p className={cn(['text-sm text-secondary'])}>{children}</p>
        {action}
      </div>
    </div>
  );
}

function SetupProgress({
  check,
  state,
}: Readonly<{
  check: SetupCheck;
  state: SetupCheckState;
}>) {
  const title = state === 'error' ? 'No pudimos completar este paso' : check.label;
  const detail =
    state === 'checking'
      ? check.checkingDetail
      : state === 'success'
        ? `${check.successDetail} Continuando…`
        : 'Revisa la conexión e inténtalo de nuevo.';

  return (
    <div className={cn(['space-y-3'])}>
      <h1 className={cn(['text-2xl font-semibold tracking-tight'])}>{title}</h1>
      <div
        aria-live="polite"
        className={cn(['flex items-center gap-2 text-sm text-secondary'])}
      >
        {state !== 'error' ? (
          <LoaderCircle aria-hidden="true" className={cn(['h-4 w-4 animate-spin'])} />
        ) : null}
        <span>{detail}</span>
      </div>
    </div>
  );
}

function SetupCard({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <section
      className={cn([
        'rounded-xl border border-border bg-surface',
        'p-5 shadow-sm sm:p-6',
      ])}
    >
      {children}
    </section>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef('');
  const [validationRun, setValidationRun] = useState(0);
  const [phase, setPhase] = useState<SetupPhase>('welcome');
  const [activeCheck, setActiveCheck] = useState<SetupCheckKey>('server');
  const [checkStates, setCheckStates] = useState(createInitialCheckStates);
  const [validationError, setValidationError] = useState('');
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const ownerMutation = useMutation({
    mutationFn: (values: SetupOwnerFormValues) => {
      if (!idempotencyKey.current) {
        idempotencyKey.current = crypto.randomUUID();
      }

      return createOwner(values, idempotencyKey.current);
    },
    onError: (error) => {
      if (
        error instanceof ApiClientError &&
        error.problem?.code === 'INSTALLATION_COMPLETED'
      ) {
        queryClient.setQueryData<SetupStatus>(['setup', 'status'], {
          installationStatus: 'COMPLETED',
          ready: false,
        });
        setPhase('finishing');
        router.replace('/login');
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData<SetupStatus>(['setup', 'status'], {
        installationStatus: 'COMPLETED',
        ready: false,
      });
      queryClient.setQueryData(['setup', 'createdOwner'], result.owner);
      setPhase('finishing');
      router.replace('/login');
    },
  });

  useEffect(() => {
    let cancelled = false;
    let activeCheck: SetupCheckKey = 'server';

    const updateCheck = (key: SetupCheckKey, state: SetupCheckState) => {
      if (cancelled) {
        return;
      }

      setActiveCheck(key);
      setCheckStates((current) => ({
        ...current,
        [key]: state,
      }));
    };

    const validateSetup = async () => {
      setValidationError('');
      setSetupStatus(null);

      let status: SetupStatus;

      try {
        status = await getSetupStatus();
      } catch {
        if (!cancelled) {
          setPhase('load-error');
        }
        return;
      }

      if (cancelled) {
        return;
      }

      if (status.installationStatus === 'COMPLETED') {
        setPhase('finishing');
        router.replace('/login');
        return;
      }

      setPhase('checking');

      try {
        updateCheck('server', 'checking');
        await wait(checkStartDelay);
        await getHealthLive();
        updateCheck('server', 'success');
        await wait(checkResultDelay);

        if (cancelled) {
          return;
        }

        activeCheck = 'database';
        updateCheck(activeCheck, 'checking');
        await wait(checkStartDelay);
        await getHealthReady();
        updateCheck(activeCheck, 'success');
        await wait(checkResultDelay);

        if (cancelled) {
          return;
        }

        activeCheck = 'installation';
        updateCheck(activeCheck, 'checking');
        await wait(checkStartDelay);
        if (!status.ready) {
          throw new Error('La instalación todavía no está lista para continuar.');
        }

        updateCheck(activeCheck, 'success');
        await wait(checkResultDelay);

        if (cancelled) {
          return;
        }

        setSetupStatus(status);
        setPhase('ready');
      } catch (error) {
        if (cancelled) {
          return;
        }

        updateCheck(activeCheck, 'error');
        setPhase('error');
        setValidationError(
          error instanceof ApiClientError && error.status === 503
            ? 'No pudimos completar la preparación. Inténtalo de nuevo cuando Geedyx esté disponible.'
            : 'No pudimos comprobar la preparación de Geedyx. Revisa la conexión e inténtalo de nuevo.',
        );
      }
    };

    void validateSetup();

    return () => {
      cancelled = true;
    };
  }, [router, validationRun]);

  useEffect(() => {
    if (phase !== 'ready') {
      return;
    }

    const timer = window.setTimeout(() => {
      setPhase('form');
    }, checkResultDelay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase]);

  const retryValidation = () => {
    setActiveCheck('server');
    setCheckStates(createInitialCheckStates());
    setPhase('welcome');
    setValidationError('');
    setValidationRun((current) => current + 1);
  };

  const serverError = ownerMutation.error
    ? ownerMutation.error instanceof ApiClientError &&
      ownerMutation.error.status === 503
      ? 'No pudimos completar la preparación. Inténtalo de nuevo cuando Geedyx esté disponible.'
      : ownerMutation.error.message
    : '';

  if (phase === 'finishing') {
    return (
      <SetupShell>
        <SetupCard>
          <div className={cn(['space-y-3'])}>
            <h1 className={cn(['text-2xl font-semibold tracking-tight'])}>
              Abriendo el acceso
            </h1>
            <p
              aria-live="polite"
              className={cn(['flex items-center gap-2 text-sm text-secondary'])}
            >
              <LoaderCircle
                aria-hidden="true"
                className={cn(['h-4 w-4 animate-spin'])}
              />
              <span>Ya puedes iniciar sesión en Geedyx.</span>
            </p>
          </div>
        </SetupCard>
      </SetupShell>
    );
  }

  if (phase === 'load-error') {
    return (
      <SetupShell>
        <SetupCard>
          <div className={cn(['space-y-3'])}>
            <h1 className={cn(['text-2xl font-semibold tracking-tight'])}>
              No pudimos cargar Geedyx
            </h1>
            <p className={cn(['text-sm text-secondary'])}>
              Inténtalo de nuevo cuando la aplicación esté disponible.
            </p>
            <button
              className={cn([
                'inline-flex items-center justify-center rounded-full',
                'border border-border-strong px-3 py-1.5',
                'text-sm font-medium',
                'transition hover:bg-surface-subtle',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
              ])}
              onClick={retryValidation}
              type="button"
            >
              Reintentar
            </button>
          </div>
        </SetupCard>
      </SetupShell>
    );
  }

  if (phase === 'welcome') {
    return (
      <SetupShell>
        <SetupCard>
          <div className={cn(['space-y-3'])}>
            <p className={cn(['text-sm font-medium text-accent'])}>
              Instalación inicial
            </p>
            <h1 className={cn(['text-2xl font-semibold tracking-tight'])}>
              Bienvenida
            </h1>
            <div
              aria-live="polite"
              className={cn(['mt-6 flex items-center gap-2 text-sm text-secondary'])}
            >
              <LoaderCircle
                aria-hidden="true"
                className={cn(['h-4 w-4 animate-spin'])}
              />
              <span>Vamos a preparar todo para ti. Tomará unos segundos.</span>
            </div>
          </div>
        </SetupCard>
      </SetupShell>
    );
  }

  if (phase === 'checking' || phase === 'error') {
    return (
      <SetupShell>
        <SetupCard>
          <div className={cn(['mb-6'])}>
            <p className={cn(['text-sm font-medium text-accent'])}>
              Instalación inicial
            </p>
          </div>

          <SetupProgress
            check={setupChecks.find(({ key }) => key === activeCheck) ?? setupChecks[0]}
            state={checkStates[activeCheck]}
          />

          {phase === 'error' ? (
            <SetupMessage
              action={
                <button
                  className={cn([
                    'inline-flex items-center justify-center rounded-full',
                    'border border-border-strong px-3 py-1.5',
                    'text-sm font-medium',
                    'transition hover:bg-surface-subtle',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
                  ])}
                  onClick={retryValidation}
                  type="button"
                >
                  Reintentar
                </button>
              }
            >
              {validationError}
            </SetupMessage>
          ) : null}
        </SetupCard>
      </SetupShell>
    );
  }

  if (phase === 'ready') {
    return (
      <SetupShell>
        <SetupCard>
          <div className={cn(['space-y-2'])}>
            <p className={cn(['text-sm font-medium text-success-strong'])}>
              Preparación completada
            </p>
            <h1 className={cn(['text-2xl font-semibold tracking-tight'])}>
              Todo está listo
            </h1>
            <div
              aria-live="polite"
              className={cn(['mt-6 flex items-center gap-2 text-sm text-secondary'])}
            >
              <LoaderCircle
                aria-hidden="true"
                className={cn(['h-4 w-4 animate-spin'])}
              />
              <span>Abriendo el formulario…</span>
            </div>
          </div>
        </SetupCard>
      </SetupShell>
    );
  }

  if (!setupStatus) {
    return null;
  }

  return (
    <SetupShell>
      <SetupCard>
        <div className={cn(['mb-6 space-y-2'])}>
          <p className={cn(['text-sm font-medium text-accent'])}>Instalación inicial</p>
          <h1 className={cn(['text-2xl font-semibold tracking-tight'])}>
            Crea tu cuenta principal
          </h1>
          <p className={cn(['text-sm text-secondary'])}>
            Esta será la cuenta que usarás para administrar Geedyx.
          </p>
        </div>

        <SetupOwnerForm
          isSubmitting={ownerMutation.isPending}
          onSubmit={async (values) => {
            await ownerMutation.mutateAsync(values);
          }}
          serverError={serverError}
        />
      </SetupCard>
    </SetupShell>
  );
}
