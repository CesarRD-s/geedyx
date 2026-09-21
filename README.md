# Geedyx

Monorepo inicial para Geedyx, construido únicamente a partir de la documentación funcional y técnica de `docs/`.

## Stack fijado

- Node.js 24.16.0 LTS
- pnpm 11.19.0
- Next.js 16.3.4 + React 19.2.8
- NestJS 12
- PostgreSQL 17
- Prisma ORM 7.10.0
- TypeScript estricto
- Tailwind CSS 4, `next-themes` y `lucide-react`

## Estructura

```text
apps/
├── api/        # NestJS, reglas de negocio y acceso a PostgreSQL
└── web/        # Next.js App Router, UI administrativa
packages/
└── contracts/  # Tipos compartidos de contratos HTTP
database/       # Prisma, migraciones y semillas
docs/            # Documentación funcional versionada
```

## Inicio local

1. Instalar Node.js 24.16.0 y pnpm 11.19.0.
2. Copiar `.env.example` a `.env` y ajustar valores si hace falta.
3. Iniciar PostgreSQL con `docker compose up -d postgres` cuando Docker esté disponible.
4. Instalar dependencias: `pnpm install`.
5. Generar Prisma: `pnpm db:generate`.
6. Crear/aplicar la migración inicial: `pnpm db:migrate`.
7. Ejecutar la semilla: `pnpm db:seed`.
8. Levantar web y API: `pnpm dev`.

URLs locales:

- Web: <http://localhost:3000>
- API: <http://localhost:4000>
- Health live: <http://localhost:4000/health/live>
- Health ready: <http://localhost:4000/health/ready>
- Setup status: <http://localhost:4000/api/v1/setup/status>

## Comandos principales

| Comando                  | Uso                                                 |
| ------------------------ | --------------------------------------------------- |
| `pnpm dev`               | Web y API en paralelo.                              |
| `pnpm dev:web`           | Solo Next.js.                                       |
| `pnpm dev:api`           | Solo NestJS.                                        |
| `pnpm build`             | Contratos, Prisma, API y Web.                       |
| `pnpm validate`          | Formato, lint, tipos, pruebas y build.              |
| `pnpm api:smoke`         | Smoke test API + PostgreSQL con una base limpia.    |
| `pnpm db:migrate`        | Migración de desarrollo.                            |
| `pnpm db:migrate:deploy` | Migraciones en un entorno desplegado.               |
| `pnpm db:status`         | Estado de migraciones.                              |
| `pnpm db:reset`          | Reset destructivo, solo con confirmación explícita. |

## Flujo de módulos

El flujo de trabajo, estados y criterios de cierre están en [`docs/DEVELOPMENT-WORKFLOW.md`](docs/DEVELOPMENT-WORKFLOW.md) y [`docs/MODULE-STATUS.md`](docs/MODULE-STATUS.md). Ningún módulo se considera terminado por compilar solamente: debe cumplir el contrato funcional, servidor, UI, auditoría, pruebas y validación de regresión.

## Publicación del repositorio

La rama de publicación es `main`. Antes de abrir un pull request o publicar cambios, ejecutar:

```bash
pnpm validate
```

Para conectar este repositorio con su remoto y publicar la rama inicial:

```bash
git remote add origin <URL_DEL_REPOSITORIO>
git push -u origin main
```

El workflow de CI ejecuta `pnpm validate` en cada pull request hacia `main` y en cada push a `main`.
