'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import type {
  AuthSession,
  CategoriesResponse,
  ProductsResponse,
} from '@geedyx/contracts';
import {
  FeedbackAlert,
  Modal,
  useToast,
} from '../../../../components/feedback/feedback';
import { PaginationControls } from '../../../../components/data/pagination-controls';
import { Input } from '../../../../components/forms/input';
import { PageHeader } from '../../../../components/layout/page-header';
import {
  ApiClientError,
  createProduct,
  getCategories,
  getCurrentSession,
  getProducts,
} from '../../../../lib/api-client';
import { cn } from '../../../../lib/cn';

const productSchema = z.object({
  title: z.string().trim().min(1, 'Escribe el nombre del producto.').max(180),
  sku: z.string().trim().min(1, 'Escribe el SKU.').max(80),
  price: z
    .string()
    .min(1, 'Escribe el precio.')
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, {
      message: 'El precio no puede ser negativo.',
    }),
  categoryId: z.string(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const sessionQueryKey = ['auth', 'session'];
const productsQueryKey = ['products'];
const categoriesQueryKey = ['products', 'categories'];

function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat('es-HN', {
    currency: 'HNL',
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(priceCents / 100);
}

function productStatusLabel(status: string): string {
  if (status === 'ACTIVE') return 'Activo';
  if (status === 'ARCHIVED') return 'Archivado';
  return 'Borrador';
}

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const sessionQuery = useQuery<AuthSession, ApiClientError>({
    queryFn: getCurrentSession,
    queryKey: sessionQueryKey,
  });
  const canRead = Boolean(
    sessionQuery.data?.user.permissions.includes('products.read'),
  );
  const canManage = Boolean(
    sessionQuery.data?.user.permissions.includes('products.manage'),
  );
  const productsQuery = useQuery<ProductsResponse, ApiClientError>({
    enabled: canRead,
    queryFn: () => getProducts({ page, pageSize }),
    queryKey: [...productsQueryKey, page, pageSize],
  });
  const categoriesQuery = useQuery<CategoriesResponse, ApiClientError>({
    enabled: canRead,
    queryFn: () => getCategories({ page: 1, pageSize: 100 }),
    queryKey: [...categoriesQueryKey, 1, 100],
  });
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      setCreateOpen(false);
      notify({
        message: 'El producto quedó guardado como borrador.',
        title: 'Producto creado',
        tone: 'success',
      });
    },
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ProductFormValues>({
    defaultValues: {
      categoryId: '',
      price: '0',
      sku: '',
      title: '',
    },
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
  });

  useEffect(() => {
    if (sessionQuery.error?.status === 401) router.replace('/login');
  }, [router, sessionQuery.error]);

  const onSubmit: SubmitHandler<ProductFormValues> = async (values) => {
    setFormError('');
    createMutation.reset();
    try {
      await createMutation.mutateAsync({
        categoryId: values.categoryId || undefined,
        priceCents: Math.round(Number(values.price) * 100),
        sku: values.sku,
        title: values.title,
      });
      reset();
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : 'No pudimos crear el producto. Inténtalo de nuevo.',
      );
    }
  };

  if (sessionQuery.isPending) {
    return <p className={cn(['text-sm text-secondary'])}>Cargando productos…</p>;
  }
  if (!sessionQuery.data || !canRead) {
    return (
      <FeedbackAlert tone="error">
        No tienes permiso para consultar productos.
      </FeedbackAlert>
    );
  }

  return (
    <div className={cn(['space-y-6'])}>
      <PageHeader
        actions={
          canManage ? (
            <button
              className={cn([
                'inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2',
                'text-sm font-medium text-accent-foreground transition hover:bg-accent-hover',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30',
              ])}
              onClick={() => {
                setFormError('');
                createMutation.reset();
                setCreateOpen(true);
              }}
              type="button"
            >
              <Plus aria-hidden="true" className={cn(['h-4 w-4'])} />
              Nuevo producto
            </button>
          ) : null
        }
        description="Consulta precios, categorías y códigos de cada producto."
        eyebrow="Catálogo"
        title="Productos"
      />

      <section
        className={cn([
          'space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm',
        ])}
      >
        <p className={cn(['text-sm text-secondary'])}>
          Los productos nuevos comienzan como borradores.
        </p>

        {productsQuery.isPending ? (
          <p className={cn(['text-sm text-secondary'])}>Cargando productos…</p>
        ) : productsQuery.isError ? (
          <FeedbackAlert tone="error">No pudimos cargar el catálogo.</FeedbackAlert>
        ) : productsQuery.data.products.length === 0 ? (
          <p
            className={cn([
              'rounded-xl border border-dashed border-border-strong p-6 text-center text-sm text-secondary',
            ])}
          >
            Todavía no hay productos registrados.
          </p>
        ) : (
          <>
            <div className={cn(['grid gap-3 xl:grid-cols-2'])}>
              {productsQuery.data.products.map((product) => (
                <article
                  className={cn([
                    'rounded-xl border border-border bg-surface-subtle p-4',
                  ])}
                  key={product.id}
                >
                  <div
                    className={cn(['flex flex-wrap items-start justify-between gap-3'])}
                  >
                    <div className={cn(['min-w-0'])}>
                      <h3 className={cn(['font-medium'])}>{product.title}</h3>
                      <p className={cn(['mt-1 text-sm text-secondary'])}>
                        {product.categoryName ?? 'Sin categoría'}
                      </p>
                    </div>
                    <span
                      className={cn([
                        'rounded-full bg-accent-muted px-2.5 py-1 text-xs font-medium text-accent',
                      ])}
                    >
                      {productStatusLabel(product.status)}
                    </span>
                  </div>
                  <div
                    className={cn([
                      'mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted',
                    ])}
                  >
                    {product.variants.map((variant) => (
                      <span key={variant.id}>
                        {variant.sku} · {formatPrice(variant.priceCents)}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <PaginationControls
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPage(1);
                setPageSize(nextPageSize);
              }}
              pagination={productsQuery.data.pagination}
            />
          </>
        )}
      </section>

      <Modal
        description="Registra la ficha base y la primera variante comercial."
        footer={
          <>
            <button
              className={cn([
                'rounded-full border border-border-strong px-3 py-2 text-sm font-medium',
                'transition hover:bg-surface-subtle',
              ])}
              onClick={() => setCreateOpen(false)}
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
              disabled={createMutation.isPending}
              form="product-create-form"
              type="submit"
            >
              {createMutation.isPending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className={cn(['h-4 w-4 animate-spin'])}
                />
              ) : null}
              {createMutation.isPending ? 'Creando…' : 'Crear producto'}
            </button>
          </>
        }
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        size="xl"
        title="Nuevo producto"
      >
        <form
          aria-busy={createMutation.isPending}
          className={cn(['space-y-5'])}
          id="product-create-form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className={cn(['grid gap-5 sm:grid-cols-2 lg:grid-cols-3'])}>
            <FormField
              error={errors.title?.message}
              label="Nombre"
              name="product-title"
            >
              <Input id="product-title" {...register('title')} />
            </FormField>
            <FormField error={errors.sku?.message} label="SKU" name="product-sku">
              <Input id="product-sku" {...register('sku')} />
            </FormField>
            <FormField
              error={errors.price?.message}
              label="Precio"
              name="product-price"
            >
              <Input
                id="product-price"
                min="0"
                step="0.01"
                type="number"
                {...register('price')}
              />
            </FormField>
            <FormField label="Categoría" name="product-category">
              <select
                className={selectStyles}
                id="product-category"
                {...register('categoryId')}
              >
                <option value="">Sin categoría</option>
                {categoriesQuery.data?.categories
                  .filter((category) => !category.archivedAt)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </FormField>
          </div>
          {formError ? <FeedbackAlert tone="error">{formError}</FeedbackAlert> : null}
        </form>
      </Modal>
    </div>
  );
}

const selectStyles = cn([
  'w-full rounded-xl border border-input-border bg-input px-3 py-2.5 text-sm',
  'text-foreground focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20',
]);

function FormField({
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
