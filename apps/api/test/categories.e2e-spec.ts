import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const TEST_USER = {
  username: 'e2e-categories-admin',
  email: 'e2e-categories@example.com',
  password: 'S3cure-passw0rd!',
};

const TEST_SLUGS = [
  'e2e-electronica',
  'e2e-electronica-y-tecnologia',
  'e2e-ropa-y-calzado',
  'e2e-peliculas',
];

const ELECTRONICA = { name: 'E2E Electrónica', slug: 'e2e-electronica' };
const ELECTRONICA_TECNOLOGIA = {
  name: 'E2E Electrónica y Tecnología',
  slug: 'e2e-electronica-y-tecnologia',
};
const ROPA = { name: 'E2E Ropa y Calzado', slug: 'e2e-ropa-y-calzado' };

function getCookie(setCookieHeader: readonly string[] | undefined): string {
  if (!setCookieHeader || setCookieHeader.length === 0) {
    throw new Error('Expected a Set-Cookie header');
  }
  return setCookieHeader[0].split(';')[0];
}

describe('Categories (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authCookie: string;
  let electronicaId: string;
  let ropaId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const stale = await prisma.category.findMany({
      where: { slug: { in: TEST_SLUGS } },
      select: { id: true },
    });
    if (stale.length > 0) {
      await prisma.product.deleteMany({
        where: { categoryId: { in: stale.map((c) => c.id) } },
      });
      await prisma.category.deleteMany({ where: { slug: { in: TEST_SLUGS } } });
    }
    await prisma.user.deleteMany({ where: { email: TEST_USER.email } });

    const passwordHash = await argon2.hash(TEST_USER.password);
    await prisma.user.create({
      data: {
        username: TEST_USER.username,
        email: TEST_USER.email,
        passwordHash,
      },
    });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(200);
    authCookie = getCookie(login.headers['set-cookie'] as string[]);
  });

  afterAll(async () => {
    const created = await prisma.category.findMany({
      where: { slug: { in: TEST_SLUGS } },
      select: { id: true },
    });
    if (created.length > 0) {
      await prisma.product.deleteMany({
        where: { categoryId: { in: created.map((c) => c.id) } },
      });
      await prisma.category.deleteMany({ where: { slug: { in: TEST_SLUGS } } });
    }
    await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
    await app.close();
  });

  describe('POST /categories', () => {
    it('creates a category and generates the slug from the name', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('Cookie', authCookie)
        .send({ name: '  E2E  Electrónica ' })
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        name: ELECTRONICA.name,
        slug: ELECTRONICA.slug,
      });
      electronicaId = res.body.id;
    });

    it('rejects a duplicate slug (same normalized name)', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('Cookie', authCookie)
        .send({ name: 'e2e electrónica' })
        .expect(409);

      expect(res.body).toMatchObject({ statusCode: 409 });
    });

    it('rejects invalid names', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .set('Cookie', authCookie)
        .send({ name: '' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/categories')
        .set('Cookie', authCookie)
        .send({ name: '   ' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/categories')
        .set('Cookie', authCookie)
        .send({})
        .expect(400);
    });

    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'No Auth' })
        .expect(401);
    });
  });

  describe('GET /categories', () => {
    it('lists categories ordered by name, minimal payload', async () => {
      const res = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.every((c: unknown) => c && typeof c === 'object')).toBe(
        true,
      );
      const first = res.body.find(
        (c: { slug: string }) => c.slug === ELECTRONICA.slug,
      );
      expect(first).toEqual({
        id: electronicaId,
        name: ELECTRONICA.name,
        slug: ELECTRONICA.slug,
      });
      expect(Object.keys(first).sort()).toEqual(['id', 'name', 'slug']);
    });
  });

  describe('GET /categories/:id', () => {
    it('returns a category by id (public)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/categories/${electronicaId}`)
        .expect(200);

      expect(res.body).toEqual({
        id: electronicaId,
        name: ELECTRONICA.name,
        slug: ELECTRONICA.slug,
      });
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app.getHttpServer())
        .get('/categories/does-not-exist')
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });
  });

  describe('GET /categories/slug/:slug', () => {
    it('returns a category by slug (public)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/categories/slug/${ELECTRONICA.slug}`)
        .expect(200);

      expect(res.body.id).toBe(electronicaId);
    });

    it('returns 404 for an unknown slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/categories/slug/does-not-exist')
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });
  });

  describe('PATCH /categories/:id', () => {
    it('creates the second category used by update tests', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('Cookie', authCookie)
        .send({ name: ROPA.name })
        .expect(201);

      expect(res.body.slug).toBe(ROPA.slug);
      ropaId = res.body.id;
    });

    it('rejects a slug conflict with another category', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/categories/${ropaId}`)
        .set('Cookie', authCookie)
        .send({ name: ELECTRONICA.name })
        .expect(409);

      expect(res.body).toMatchObject({ statusCode: 409 });
    });

    it('updates the name and regenerates the slug', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/categories/${electronicaId}`)
        .set('Cookie', authCookie)
        .send({ name: 'E2E Electrónica y Tecnología ' })
        .expect(200);

      expect(res.body).toEqual({
        id: electronicaId,
        name: ELECTRONICA_TECNOLOGIA.name,
        slug: ELECTRONICA_TECNOLOGIA.slug,
      });
    });

    it('rejects invalid updates', async () => {
      await request(app.getHttpServer())
        .patch(`/categories/${electronicaId}`)
        .set('Cookie', authCookie)
        .send({})
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/categories/${electronicaId}`)
        .set('Cookie', authCookie)
        .send({ name: '   ' })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/categories/${electronicaId}`)
        .set('Cookie', authCookie)
        .send({ softDelete: true })
        .expect(400);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app.getHttpServer())
        .patch('/categories/does-not-exist')
        .set('Cookie', authCookie)
        .send({ name: 'X' })
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .patch(`/categories/${electronicaId}`)
        .send({ name: 'X' })
        .expect(401);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('deletes a category without products', async () => {
      await request(app.getHttpServer())
        .delete(`/categories/${ropaId}`)
        .set('Cookie', authCookie)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/categories/${ropaId}`)
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app.getHttpServer())
        .delete('/categories/does-not-exist')
        .set('Cookie', authCookie)
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('rejects deletion of a category that has products (409)', async () => {
      const created = await request(app.getHttpServer())
        .post('/categories')
        .set('Cookie', authCookie)
        .send({ name: 'E2E Películas' })
        .expect(201);
      const categoryId = created.body.id;

      await prisma.product.create({
        data: {
          name: 'E2E Product',
          slug: 'e2e-product',
          sku: 'E2E-SKU-1',
          price: 9.99,
          categoryId,
        },
      });

      const res = await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .set('Cookie', authCookie)
        .expect(409);
      expect(res.body).toMatchObject({ statusCode: 409 });

      await prisma.product.deleteMany({ where: { categoryId } });
    });

    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .delete(`/categories/${electronicaId}`)
        .expect(401);
    });
  });
});