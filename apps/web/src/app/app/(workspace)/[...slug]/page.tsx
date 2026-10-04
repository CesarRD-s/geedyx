import { PageHeader } from '../../../../components/layout/page-header';
import { cn } from '../../../../lib/cn';

const routeLabels: Record<string, string> = {
  audit: 'Registro de auditoría',
  customers: 'Clientes',
  inventory: 'Inventario',
  movements: 'Movimientos de inventario',
  payments: 'Pagos',
  preferences: 'Preferencias',
  products: 'Productos',
  receipts: 'Comprobantes',
  reports: 'Reportes operativos',
  roles: 'Roles y permisos',
  sales: 'Ventas',
  sessions: 'Sesiones',
  suppliers: 'Proveedores',
  categories: 'Categorías',
  company: 'Empresa',
};

type PlaceholderPageProps = {
  params: Promise<{ slug: string[] }>;
};

export default async function PlaceholderPage({ params }: PlaceholderPageProps) {
  const { slug } = await params;
  const currentLabel = routeLabels[slug.at(-1) ?? ''] ?? 'Módulo';

  return (
    <div className={cn(['space-y-6'])}>
      <PageHeader
        description="La navegación y la responsabilidad de este módulo ya están reservadas para su implementación funcional."
        eyebrow="Estructura del espacio de trabajo"
        title={currentLabel}
      />
      <section
        className={cn([
          'rounded-lg border border-border bg-surface p-6',
          'text-sm text-secondary',
        ])}
      >
        Este módulo está preparado en el menú y se habilitará cuando cerremos su flujo
        funcional, permisos y datos.
      </section>
    </div>
  );
}
