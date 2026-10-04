'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, LoaderCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AuthSession, CategoriesResponse } from '@geedyx/contracts';
import {
  FeedbackAlert,
  Modal,
  useToast,
} from '../../../../../components/feedback/feedback';
import { PaginationControls } from '../../../../../components/data/pagination-controls';
import { Input } from '../../../../../components/forms/input';
import { PageHeader } from '../../../../../components/layout/page-header';
import {
  ApiClientError,
  createCategory,
  getCategories,
  getCurrentSession,
} from '../../../../../lib/api-client';
import { cn } from '../../../../../lib/cn';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre de la categoría.').max(120),
  parentId: z.string(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const categoriesQueryKey = ['products', 'categories'];
const sessionQueryKey = ['auth', 'session'];

export default function CategoriesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
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
  const categoriesQuery = useQuery<CategoriesResponse, ApiClientError>({
    enabled: canRead,
    queryFn: () => getCategories({ page, pageSize }),
    queryKey: [...categoriesQueryKey, page, pageSize],
  });
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
      setCreateOpen(false);
      notify({
        message: 'La categoría quedó disponible para organizar productos.',
        title: 'Categoría creada',
        tone: 'success',
      });
    },
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<CategoryFormValues>({
    defaultValues: {
      name: '',
      parentId: '',
    },
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    if (sessionQuery.error?.status === 401) router.replace('/login');
  }, [router, sessionQuery.error]);

  const onSubmit: SubmitHandler<CategoryFormValues> = async (values) => {
    setFormError('');
    createMutation.reset();
    try {
      await createMutation.mutateAsync({
        name: values.name,
        parentId: values.parentId || undefined,
      });
      reset();
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : 'No pudimos crear la categoría. Inténtalo de nuevo.',
      );
    }
  };

  if (sessionQuery.isPending || categoriesQuery.isPending) {
    return <p className={cn(['text-sm text-secondary'])}>Cargando categorías…</p>;
  }
  if (!sessionQuery.data || !canRead) {
    return (
      <FeedbackAlert tone="error">
        No tienes permiso para consultar categorías.
      </FeedbackAlert>
    );
  }
  if (categoriesQuery.isError) {
    return (
      <FeedbackAlert tone="error">No pudimos cargar las categorías.</FeedbackAlert>
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
              Nueva categoría
            </button>
          ) : null
        }
        description="Organiza los productos con una taxonomía simple y jerárquica."
        eyebrow="Catálogo"
        title="Categorías"
      />
      <section
        className={cn([
          'space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm',
        ])}
      >
        <div className={cn(['flex items-start justify-between gap-4'])}>
          <div>
            <h2 className={cn(['text-lg font-semibold'])}>Categorías registradas</h2>
            <p className={cn(['mt-1 text-sm text-secondary'])}>
              Puedes crear niveles padre e hijo.
            </p>
          </div>
          <FolderPlus aria-hidden="true" className={cn(['h-5 w-5 text-muted'])} />
        </div>
        {categoriesQuery.data.categories.length === 0 ? (
          <FeedbackAlert>No hay categorías registradas.</FeedbackAlert>
        ) : (
          <>
            <div className={cn(['space-y-2'])}>
              {categoriesQuery.data.categories.map((category) => (
                <article
                  className={cn([
                    'flex items-center justify-between rounded-xl border border-border bg-surface-subtle p-4',
                  ])}
                  key={category.id}
                >
                  <div>
                    <h3 className={cn(['font-medium'])}>{category.name}</h3>
                    <p className={cn(['mt-1 text-xs text-muted'])}>
                      {category.parentId ? 'Subcategoría' : 'Categoría principal'}
                    </p>
                  </div>
                  <span
                    className={cn([
                      'rounded-full bg-accent-muted px-2 py-1 text-xs text-accent',
                    ])}
                  >
                    {category.archivedAt ? 'Archivada' : 'Activa'}
                  </span>
                </article>
              ))}
            </div>
            <PaginationControls
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPage(1);
                setPageSize(nextPageSize);
              }}
              pagination={categoriesQuery.data.pagination}
            />
          </>
        )}
      </section>

      <Modal
        description="Usa nombres claros y reutilizables para organizar el catálogo."
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
              form="category-create-form"
              type="submit"
            >
              {createMutation.isPending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className={cn(['h-4 w-4 animate-spin'])}
                />
              ) : null}
              {createMutation.isPending ? 'Creando…' : 'Crear categoría'}
            </button>
          </>
        }
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        size="lg"
        title="Nueva categoría"
      >
        <form
          aria-busy={createMutation.isPending}
          className={cn(['grid gap-5 sm:grid-cols-2'])}
          id="category-create-form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className={cn(['space-y-1.5'])}>
            <label className={cn(['text-sm font-medium'])} htmlFor="category-name">
              Nombre
            </label>
            <Input id="category-name" {...register('name')} />
            {errors.name ? (
              <p className={cn(['text-xs text-danger'])}>{errors.name.message}</p>
            ) : null}
          </div>
          <div className={cn(['space-y-1.5'])}>
            <label className={cn(['text-sm font-medium'])} htmlFor="category-parent">
              Categoría padre
            </label>
            <select
              className={selectStyles}
              id="category-parent"
              {...register('parentId')}
            >
              <option value="">Sin categoría padre</option>
              {categoriesQuery.data.categories
                .filter((category) => !category.archivedAt)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>
          <div className={cn(['sm:col-span-2'])}>
            {formError ? <FeedbackAlert tone="error">{formError}</FeedbackAlert> : null}
          </div>
        </form>
      </Modal>
    </div>
  );
}

const selectStyles = cn([
  'w-full rounded-xl border border-input-border bg-input px-3 py-2.5 text-sm',
  'text-foreground focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20',
]);
