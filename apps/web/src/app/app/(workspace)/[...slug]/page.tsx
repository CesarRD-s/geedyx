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
  roles: 'Perfiles de acceso',
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
        description="Esta sección todavía no está disponible."
        title={currentLabel}
      />
    </div>
  );
}
