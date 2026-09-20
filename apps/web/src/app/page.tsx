import { ArrowRight, CheckCircle2, Database, Server } from 'lucide-react';
import { BrandLogo } from '../components/brand-logo';

const checks = [
  {
    label: 'Web administrativa',
    detail: 'Next.js App Router',
    icon: Server,
  },
  {
    label: 'API versionada',
    detail: '/api/v1 y Problem Details',
    icon: ArrowRight,
  },
  {
    label: 'Base de datos',
    detail: 'PostgreSQL + Prisma',
    icon: Database,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-4xl flex-col justify-center gap-8">
        <header className="space-y-3">
          <BrandLogo />
          <p className="text-sm font-medium text-accent">Base técnica inicial</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Geedyx</h1>
          <p className="max-w-2xl text-base text-secondary">
            Sistema ERP modular para una operación sencilla. Esta pantalla confirma que
            la Web está conectada al monorepo preparado para avanzar módulo por módulo.
          </p>
        </header>

        <section
          className="grid gap-3 sm:grid-cols-3"
          aria-label="Componentes preparados"
        >
          {checks.map(({ label, detail, icon: Icon }) => (
            <article
              key={label}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-muted text-accent">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-medium">{label}</h2>
                  <p className="mt-1 text-xs text-muted">{detail}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-strong">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>Monorepo inicial listo para la primera validación funcional.</span>
        </div>
      </div>
    </main>
  );
}
