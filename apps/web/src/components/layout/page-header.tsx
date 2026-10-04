import { cn } from '../../lib/cn';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header
      className={cn([
        'flex flex-wrap items-start justify-between gap-4',
        'border-b border-border pb-5',
      ])}
    >
      <div className={cn(['min-w-0 space-y-1'])}>
        {eyebrow ? (
          <p className={cn(['text-xs font-medium uppercase tracking-wide text-muted'])}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className={cn(['text-xl font-semibold tracking-tight'])}>{title}</h1>
        {description ? (
          <p className={cn(['max-w-2xl text-sm text-secondary'])}>{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className={cn(['flex shrink-0 items-center gap-2'])}>{actions}</div>
      ) : null}
    </header>
  );
}
