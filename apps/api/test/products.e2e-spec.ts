import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const TEST_USER = {
  username: 'e2e-products-admin',
  email: 'e2e-products@example.com',
  password: 'S3cure-passw0rd!',
};

const CAT_A = { name: 'E2E Prod Cat A', slug: 'e2e-prod-cat-a' };
const CAT_B = { name: 'E2E Prod Cat B', slug: 'e2e-prod-cat-b' };

const PRODUCT_SLUGS = [
  'e2e-laptop-dell-inspiron',
  'e2e-laptop-dell-inspiron-2',
  'e2e-monitor-27-4k',
  'e2e-keyboard',
  'e2e-tablet',
  'e2e-tablet-pro',
  'e2e-mouse',
];

function getCookie(setCookieHeader: readonly string[] | undefined): string {
  if (!setCookieHeader || setCookieHeader.length === 0) {
    throw new Error('Expected a Set-Cookie header');
  }
  return setCookieHeader[0].split(';')[0];
}

describe('Products (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authCookie: string;
  let catAId: string;
  let catBId: string;
  let laptopId: string;
  let laptop2Id: string;
  let monitorId: string;
  let keyboardId: string;
  let tabletId: string;

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

    const staleProducts = await prisma.product.findMany({
      where: { slug: { in: PRODUCT_SLUGS } },
      select: { id: true },
    });
    if (staleProducts.length > 0) {
      await prisma.product.deleteMany({
        where: { id: { in: staleProducts.map((p) => p.id) } },
      });
    }
    await prisma.category.deleteMany({
      where: { slug: { in: [CAT_A.slug, CAT_B.slug] } },
    });
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

    const catA = await request(app.getHttpServer())
      .post('/categories')
      .set('Cookie', authCookie)
      .send({ name: CAT_A.name })
      .expect(201);
    catAId = catA.body.id;
    const catB = await request(app.getHttpServer())
      .post('/categories')
      .set('Cookie', authCookie)
      .send({ name: CAT_B.name })
      .expect(201);
    catBId = catB.body.id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { slug: { in: PRODUCT_SLUGS } } });
    await prisma.category.deleteMany({
      where: { slug: { in: [CAT_A.slug, CAT_B.slug] } },
    });
    await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
    await app.close();
  });

  describe('POST /products', () => {
    it('creates a product, trims the name/SKU and applies defaults', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({
          name: '  E2E  Laptop Dell Inspiron  ',
          sku: '  E2E-PRD-LAPTOP-001 ',
          price: 799.99,
          categoryId: catAId,
        })
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        name: 'E2E Laptop Dell Inspiron',
        slug: 'e2e-laptop-dell-inspiron',
        sku: 'E2E-PRD-LAPTOP-001',
        description: null,
        price: 799.99,
        stock: 0,
        lowStockThreshold: 5,
        imageUrl: null,
        isActive: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        category: { id: catAId, name: CAT_A.name, slug: CAT_A.slug },
      });
      laptopId = res.body.id;
    });

    it('resolves equal-name slug conflicts deterministically', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({
          name: 'E2E Laptop Dell Inspiron',
          sku: 'E2E-PRD-LAPTOP-002',
          price: 899.99,
          categoryId: catAId,
          stock: 2,
        })
        .expect(201);

      expect(res.body.slug).toBe('e2e-laptop-dell-inspiron-2');
      laptop2Id = res.body.id;
    });

    it('generates a URL-friendly slug and honors explicit values', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({
          name: 'E2E Monitor 27" 4K',
          sku: 'E2E-PRD-MONITOR-001',
          price: 249.5,
          categoryId: catBId,
          description: 'A monitor',
          stock: 10,
          lowStockThreshold: 3,
          isActive: true,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'E2E Monitor 27" 4K',
        slug: 'e2e-monitor-27-4k',
        price: 249.5,
        stock: 10,
        lowStockThreshold: 3,
        description: 'A monitor',
        category: { id: catBId, name: CAT_B.name, slug: CAT_B.slug },
      });
      monitorId = res.body.id;
    });

    it('creates more products used by list tests', async () => {
      const keyboard = await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({
          name: 'E2E Keyboard',
          sku: 'E2E-PRD-KEYBOARD-001',
          price: 19.99,
          categoryId: catBId,
        })
        .expect(201);
      keyboardId = keyboard.body.id;

      const tablet = await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({
          name: 'E2E Tablet',
          sku: 'E2E-PRD-TABLET-001',
          price: 399,
          categoryId: catAId,
        })
        .expect(201);
      tabletId = tablet.body.id;

      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({
          name: 'E2E Mouse',
          sku: 'E2E-PRD-MOUSE-001',
          price: 9.99,
          categoryId: catAId,
          isActive: false,
        })
        .expect(201);
    });

    it('rejects a product with a missing category (404)', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({
          name: 'E2E Orphan',
          sku: 'E2E-PRD-ORPHAN-001',
          price: 1,
          categoryId: 'does-not-exist',
        })
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('rejects a duplicate SKU (409)', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({
          name: 'E2E Clon',
          sku: 'E2E-PRD-LAPTOP-001',
          price: 1,
          categoryId: catAId,
        })
        .expect(409);
      expect(res.body).toMatchObject({ statusCode: 409 });
    });

    it('rejects invalid input (400)', async () => {
      const base = { price: 1, categoryId: catAId } as const;
      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({ ...base, name: '', sku: 'X' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({ ...base, name: '   ', sku: 'X' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({ ...base, name: 'X', sku: '' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({ ...base, name: 'X', sku: 'Y', price: -1 })
        .expect(400);
      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({ ...base, name: 'X', sku: 'Y', price: 10.999 })
        .expect(400);
      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({ ...base, name: 'X', sku: 'Y', price: 'gratis' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({ ...base, name: 'X', sku: 'Y', stock: -1 })
        .expect(400);
      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({ ...base, name: 'X', sku: 'Y', stock: 1.5 })
        .expect(400);
    });

    it('rejects unknown properties, including imageUrl (400)', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({
          name: 'X',
          sku: 'Y',
          price: 1,
          categoryId: catAId,
          imageUrl: 'https://example.com/x.png',
        })
        .expect(400);
      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({
          name: 'X',
          sku: 'Y',
          price: 1,
          categoryId: catAId,
          unexpected: true,
        })
        .expect(400);
    });

    it('rejects unauthenticated requests (401)', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'X',
          sku: 'E2E-PRD-NOAUTH-001',
          price: 1,
          categoryId: catAId,
        })
        .expect(401);
    });
  });

  describe('GET /products', () => {
    it('lists only active products by default with pagination meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/products?page=1&limit=20')
        .expect(200);

      expect(res.body).toEqual({
        data: expect.any(Array),
        meta: { page: 1, limit: 20, total: 5, totalPages: 1 },
      });
      expect(res.body.data).toHaveLength(5);
      const slugs = res.body.data.map(
        (p: { slug: string }) => p.slug,
      ) as string[];
      expect(slugs).not.toContain('e2e-mouse');
      expect(res.body.data.every((p: { isActive: boolean }) => p.isActive)).toBe(
        true,
      );
      expect(Object.keys(res.body.data[0]).sort()).toEqual([
        'category',
        'createdAt',
        'id',
        'imageUrl',
        'isActive',
        'lowStockThreshold',
        'name',
        'price',
        'sku',
        'slug',
        'stock',
        'updatedAt',
      ]);
    });

    it('paginates with limit/page and totalPages', async () => {
      const pageOne = await request(app.getHttpServer())
        .get('/products?page=1&limit=2')
        .expect(200);
      expect(pageOne.body.data).toHaveLength(2);
      expect(pageOne.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });

      const pageTwo = await request(app.getHttpServer())
        .get('/products?page=3&limit=2')
        .expect(200);
      expect(pageTwo.body.data).toHaveLength(1);
      expect(pageTwo.body.meta.page).toBe(3);
    });

    it('searches by name', async () => {
      const res = await request(app.getHttpServer())
        .get('/products?search=dell')
        .expect(200);
      expect(res.body.meta.total).toBe(2);
      const slugs = res.body.data.map(
        (p: { slug: string }) => p.slug,
      ) as string[];
      expect(slugs).toEqual(
        expect.arrayContaining([
          'e2e-laptop-dell-inspiron',
          'e2e-laptop-dell-inspiron-2',
        ]),
      );
    });

    it('searches by SKU', async () => {
      const res = await request(app.getHttpServer())
        .get('/products?search=PRD-MONITOR')
        .expect(200);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].slug).toBe('e2e-monitor-27-4k');
    });

    it('filters by category', async () => {
      const res = await request(app.getHttpServer())
        .get(`/products?categoryId=${catAId}`)
        .expect(200);
      expect(res.body.meta.total).toBe(3);
      const slugs = res.body.data.map(
        (p: { slug: string }) => p.slug,
      ) as string[];
      expect(slugs).not.toContain('e2e-mouse');
    });

    it('never exposes inactive products to anonymous queries', async () => {
      const res = await request(app.getHttpServer())
        .get('/products?isActive=false')
        .expect(200);
      expect(res.body.meta.total).toBe(5);
      const slugs = res.body.data.map(
        (p: { slug: string }) => p.slug,
      ) as string[];
      expect(slugs).not.toContain('e2e-mouse');
    });

    it('lets an authenticated admin query inactive products', async () => {
      const res = await request(app.getHttpServer())
        .get('/products?isActive=false')
        .set('Cookie', authCookie)
        .expect(200);
      expect(res.body.meta.total).toBe(1);
      const slugs = res.body.data.map(
        (p: { slug: string }) => p.slug,
      ) as string[];
      expect(slugs).toEqual(['e2e-mouse']);
    });

    it('rejects invalid query parameters (400)', async () => {
      await request(app.getHttpServer()).get('/products?page=0').expect(400);
      await request(app.getHttpServer()).get('/products?limit=0').expect(400);
      await request(app.getHttpServer()).get('/products?limit=101').expect(400);
      await request(app.getHttpServer()).get('/products?sort=foo').expect(400);
      await request(app.getHttpServer()).get('/products?order=foo').expect(400);
      await request(app.getHttpServer())
        .get('/products?isActive=maybe')
        .expect(400);
    });
  });

  describe('GET /products/:id and /products/slug/:slug', () => {
    it('returns a full detail by id (public)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/products/${laptopId}`)
        .expect(200);

      expect(res.body).toEqual({
        id: laptopId,
        name: 'E2E Laptop Dell Inspiron',
        slug: 'e2e-laptop-dell-inspiron',
        sku: 'E2E-PRD-LAPTOP-001',
        description: null,
        price: 799.99,
        stock: 0,
        lowStockThreshold: 5,
        imageUrl: null,
        isActive: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        category: { id: catAId, name: CAT_A.name, slug: CAT_A.slug },
      });
      expect(Object.keys(res.body).sort()).toEqual([
        'category',
        'createdAt',
        'description',
        'id',
        'imageUrl',
        'isActive',
        'lowStockThreshold',
        'name',
        'price',
        'sku',
        'slug',
        'stock',
        'updatedAt',
      ]);
    });

    it('returns a product by slug (public)', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/slug/e2e-monitor-27-4k')
        .expect(200);
      expect(res.body.id).toBe(monitorId);
      expect(res.body.price).toBe(249.5);
    });

    it('returns 404 for unknown id and slug', async () => {
      const byId = await request(app.getHttpServer())
        .get('/products/does-not-exist')
        .expect(404);
      expect(byId.body).toMatchObject({ statusCode: 404 });

      const bySlug = await request(app.getHttpServer())
        .get('/products/slug/does-not-exist')
        .expect(404);
      expect(bySlug.body).toMatchObject({ statusCode: 404 });
    });

    it('hides inactive products from public detail routes', async () => {
      const mouse = await request(app.getHttpServer())
        .get('/products?search=PRD-MOUSE')
        .set('Cookie', authCookie)
        .expect(200);
      const mouseProduct = mouse.body.data[0] as { id: string; slug: string };

      const byId = await request(app.getHttpServer())
        .get(`/products/${mouseProduct.id}`)
        .expect(404);
      expect(byId.body).toMatchObject({ statusCode: 404 });

      const bySlug = await request(app.getHttpServer())
        .get(`/products/slug/${mouseProduct.slug}`)
        .expect(404);
      expect(bySlug.body).toMatchObject({ statusCode: 404 });
    });

    it('returns the detail of an inactive product for an authenticated admin', async () => {
      const mouse = await request(app.getHttpServer())
        .get('/products?search=PRD-MOUSE')
        .set('Cookie', authCookie)
        .expect(200);
      const mouseProduct = mouse.body.data[0] as { id: string; slug: string };

      const res = await request(app.getHttpServer())
        .get(`/products/${mouseProduct.id}`)
        .set('Cookie', authCookie)
        .expect(200);
      expect(res.body.id).toBe(mouseProduct.id);
      expect(res.body.isActive).toBe(false);
    });
  });

  describe('PATCH /products/:id', () => {
    it('updates the name and regenerates the slug', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/products/${tabletId}`)
        .set('Cookie', authCookie)
        .send({ name: '  E2E Tablet Pro ' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: tabletId,
        name: 'E2E Tablet Pro',
        slug: 'e2e-tablet-pro',
      });
    });

    it('updates SKU, price, stock, threshold and description', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/products/${tabletId}`)
        .set('Cookie', authCookie)
        .send({
          sku: 'E2E-PRD-TABLET-002',
          price: 449.5,
          stock: 7,
          lowStockThreshold: 2,
          description: 'Updated description',
        })
        .expect(200);

      expect(res.body).toMatchObject({
        sku: 'E2E-PRD-TABLET-002',
        price: 449.5,
        stock: 7,
        lowStockThreshold: 2,
        description: 'Updated description',
      });
    });

    it('changes the category', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/products/${tabletId}`)
        .set('Cookie', authCookie)
        .send({ categoryId: catBId })
        .expect(200);

      expect(res.body.category).toEqual({
        id: catBId,
        name: CAT_B.name,
        slug: CAT_B.slug,
      });
    });

    it('keeps the slug when only non-name fields change', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/products/${tabletId}`)
        .set('Cookie', authCookie)
        .send({ stock: 8 })
        .expect(200);
      expect(res.body.slug).toBe('e2e-tablet-pro');
    });

    it('toggles isActive off and on', async () => {
      await request(app.getHttpServer())
        .patch(`/products/${monitorId}`)
        .set('Cookie', authCookie)
        .send({ isActive: false })
        .expect(200);

      const hidden = await request(app.getHttpServer())
        .get('/products?search=MONITOR')
        .expect(200);
      expect(hidden.body.meta.total).toBe(0);

      await request(app.getHttpServer())
        .patch(`/products/${monitorId}`)
        .set('Cookie', authCookie)
        .send({ isActive: true })
        .expect(200);

      const visible = await request(app.getHttpServer())
        .get('/products?search=MONITOR')
        .expect(200);
      expect(visible.body.meta.total).toBe(1);
    });

    it('rejects a missing category (404)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/products/${tabletId}`)
        .set('Cookie', authCookie)
        .send({ categoryId: 'does-not-exist' })
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('rejects a duplicate SKU (409)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/products/${laptop2Id}`)
        .set('Cookie', authCookie)
        .send({ sku: 'E2E-PRD-LAPTOP-001' })
        .expect(409);
      expect(res.body).toMatchObject({ statusCode: 409 });
    });

    it('rejects invalid updates (400)', async () => {
      await request(app.getHttpServer())
        .patch(`/products/${laptop2Id}`)
        .set('Cookie', authCookie)
        .send({})
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/products/${laptop2Id}`)
        .set('Cookie', authCookie)
        .send({ name: '   ' })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/products/${laptop2Id}`)
        .set('Cookie', authCookie)
        .send({ price: 10.999 })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/products/${laptop2Id}`)
        .set('Cookie', authCookie)
        .send({ stock: -1 })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/products/${laptop2Id}`)
        .set('Cookie', authCookie)
        .send({ isActive: 'yes' })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/products/${laptop2Id}`)
        .set('Cookie', authCookie)
        .send({ imageUrl: 'https://example.com/x.png' })
        .expect(400);
    });

    it('rejects updates for unknown ids (404)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/products/does-not-exist')
        .set('Cookie', authCookie)
        .send({ name: 'X' })
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('rejects unauthenticated requests (401)', async () => {
      await request(app.getHttpServer())
        .patch(`/products/${laptopId}`)
        .send({ name: 'X' })
        .expect(401);
    });
  });

  describe('DELETE /products/:id', () => {
    it('deletes a product physically (204)', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${keyboardId}`)
        .set('Cookie', authCookie)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/products/${keyboardId}`)
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app.getHttpServer())
        .delete('/products/does-not-exist')
        .set('Cookie', authCookie)
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('rejects unauthenticated requests (401)', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${laptopId}`)
        .expect(401);
    });
  });
});