import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import { constants } from 'node:fs';
import { access, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import {
  asImageUploadConfig,
  getMaxImageBytes,
} from '../src/images/image-upload-options.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { configureStaticAssets } from '../src/static-assets.js';

const TEST_USER = {
  username: 'e2e-img-admin',
  email: 'e2e-img@example.com',
  password: 'S3cure-passw0rd!',
};

const CATEGORY = { name: 'E2E Img Cat', slug: 'e2e-img-cat' };

const PRODUCT_NAME_PREFIX = 'E2E IMG ';

const JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52,
]);
const WEBP_BYTES = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x10, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP'),
  Buffer.from([0x56, 0x50, 0x38, 0x20]),
]);

function getCookie(setCookieHeader: readonly string[] | undefined): string {
  if (!setCookieHeader || setCookieHeader.length === 0) {
    throw new Error('Expected a Set-Cookie header');
  }
  return setCookieHeader[0].split(';')[0];
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe('Product images (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let config: ConfigService;
  let uploadDir: string;
  let maxImageBytes: number;
  let authCookie: string;
  let categoryId: string;
  let productCounter = 0;

  function storedFilePath(publicUrl: string): string {
    return path.join(uploadDir, 'products', path.basename(publicUrl));
  }

  function getProduct(id: string) {
    return request(app.getHttpServer()).get(`/products/${id}`).expect(200);
  }

  function uploadImage(productId: string, buffer: Buffer, options?: {
    filename?: string;
    contentType?: string;
  }) {
    const filename = options?.filename ?? 'upload.bin';
    const contentType = options?.contentType ?? 'image/jpeg';
    return request(app.getHttpServer())
      .post(`/products/${productId}/image`)
      .set('Cookie', authCookie)
      .attach('file', buffer, { filename, contentType });
  }

  async function createProduct(tag: string): Promise<string> {
    productCounter += 1;
    const name = `${PRODUCT_NAME_PREFIX}${tag} #${productCounter}`;
    const res = await request(app.getHttpServer())
      .post('/products')
      .set('Cookie', authCookie)
      .send({
        name,
        sku: `E2E-IMG-${tag.toUpperCase().replace(/[^A-Z0-9]/g, '_')}-${productCounter}`,
        price: 10,
        categoryId,
      })
      .expect(201);
    return res.body.id as string;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    configureStaticAssets(app);
    await app.init();

    prisma = app.get(PrismaService);
    config = app.get(ConfigService);
    uploadDir = path.resolve(config.get<string>('UPLOAD_DIR', 'uploads') ?? 'uploads');
    maxImageBytes = getMaxImageBytes(asImageUploadConfig(config));

    await prisma.product.deleteMany({
      where: { name: { startsWith: PRODUCT_NAME_PREFIX } },
    });
    await prisma.category.deleteMany({ where: { slug: CATEGORY.slug } });
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

    const category = await request(app.getHttpServer())
      .post('/categories')
      .set('Cookie', authCookie)
      .send({ name: CATEGORY.name })
      .expect(201);
    categoryId = category.body.id as string;
  });

  afterAll(async () => {
    const remaining = await prisma.product.findMany({
      where: { name: { startsWith: PRODUCT_NAME_PREFIX } },
      select: { id: true },
    });
    for (const { id } of remaining) {
      await request(app.getHttpServer())
        .delete(`/products/${id}`)
        .set('Cookie', authCookie)
        .expect(204);
    }
    await prisma.category.deleteMany({ where: { slug: CATEGORY.slug } });
    await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
    await app.close();

    const productsDir = path.join(uploadDir, 'products');
    let files: string[] = [];
    try {
      files = await readdir(productsDir);
    } catch {
      // Directory never created -> nothing left behind.
    }
    for (const file of files) {
      await unlink(path.join(productsDir, file)).catch(() => undefined);
    }
    expect(files).toEqual([]);
  });

  describe('POST /products/:id/image', () => {
    it('uploads a JPEG and stores a relative public URL', async () => {
      const id = await createProduct('JPEG');
      const res = await uploadImage(id, JPEG_BYTES, {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      }).expect(200);

      expect(res.body.imageUrl).toMatch(
        /^\/uploads\/products\/[0-9a-f-]{36}\.jpg$/,
      );


      const product = await getProduct(id);
      expect(product.body.imageUrl).toBe(res.body.imageUrl);

      expect(await pathExists(storedFilePath(res.body.imageUrl))).toBe(true);

      const served = await request(app.getHttpServer())
        .get(res.body.imageUrl as string)
        .expect(200);
      expect(served.headers['content-type']).toBe('image/jpeg');
      expect(String(served.headers['cache-control'] ?? '')).toContain('immutable');
    });

    it('uploads a PNG', async () => {
      const id = await createProduct('PNG');
      const res = await uploadImage(id, PNG_BYTES, {
        filename: 'p.png',
        contentType: 'image/png',
      }).expect(200);
      expect(res.body.imageUrl).toMatch(/\.png$/);

      expect(await pathExists(storedFilePath(res.body.imageUrl))).toBe(true);
    });

    it('uploads a WebP', async () => {
      const id = await createProduct('WEBP');
      const res = await uploadImage(id, WEBP_BYTES, {
        filename: 'w.webp',
        contentType: 'image/webp',
      }).expect(200);
      expect(res.body.imageUrl).toMatch(/\.webp$/);

      expect(await pathExists(storedFilePath(res.body.imageUrl))).toBe(true);
    });

    it('returns 404 for a missing product', async () => {
      const res = await uploadImage('does-not-exist', JPEG_BYTES).expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('returns 401 without a session cookie', async () => {
      const id = await createProduct('NOAUTH-UPLOAD');
      const res = await request(app.getHttpServer())
        .post(`/products/${id}/image`)
        .attach('file', JPEG_BYTES, {
          filename: 'x.jpg',
          contentType: 'image/jpeg',
        })
        .expect(401);
      expect(res.body).toMatchObject({ statusCode: 401 });
    });

    it('returns 400 when the file field is missing', async () => {
      const id = await createProduct('NO-FILE');
      const res = await request(app.getHttpServer())
        .post(`/products/${id}/image`)
        .set('Cookie', authCookie)
        .send({})
        .expect(400);
      expect(res.body).toMatchObject({ statusCode: 400 });
    });

    it('returns 413 for an oversized file', async () => {
      const id = await createProduct('OVERSIZE');
      const oversized = Buffer.alloc(maxImageBytes + 1, 0xff);
      const res = await uploadImage(id, oversized, {
        contentType: 'image/jpeg',
      }).expect(413);
      expect(res.body).toMatchObject({ statusCode: 413 });
    });

    it('does not let a malicious filename escape the upload directory', async () => {
      const id = await createProduct('TRAVERSAL');
      const res = await uploadImage(id, JPEG_BYTES, {
        filename: '../../../escaped.jpg',
        contentType: 'image/jpeg',
      }).expect(200);

      const url = res.body.imageUrl as string;

      expect(url).toMatch(/^\/uploads\/products\/[0-9a-f-]{36}\.jpg$/);
      expect(url).not.toContain('escaped');

      expect(await pathExists(path.join(uploadDir, '..', 'escaped.jpg'))).toBe(false);
      expect(await pathExists(storedFilePath(url))).toBe(true);
    });
  });

  describe('Replacing an image', () => {
    it('replaces the previous file and updates the URL', async () => {
      const id = await createProduct('REPLACE');

      const first = await uploadImage(id, JPEG_BYTES, {
        filename: 'a.jpg',
        contentType: 'image/jpeg',
      }).expect(200);
      const firstUrl = first.body.imageUrl as string;

      const firstPath = storedFilePath(firstUrl);
      expect(await pathExists(firstPath)).toBe(true);

      const second = await uploadImage(id, PNG_BYTES, {
        filename: 'b.png',
        contentType: 'image/png',
      }).expect(200);
      const secondUrl = second.body.imageUrl as string;

      const secondPath = storedFilePath(secondUrl);

      expect(secondUrl).not.toBe(firstUrl);
      const product = await getProduct(id);
      expect(product.body.imageUrl).toBe(secondUrl);
      expect(await pathExists(firstPath)).toBe(false);
      expect(await pathExists(secondPath)).toBe(true);
    });
  });

  describe('DELETE /products/:id/image', () => {
    it('removes the image and keeps the product', async () => {
      const id = await createProduct('DELETE-IMAGE');
      const uploaded = await uploadImage(id, JPEG_BYTES).expect(200);
      const url = uploaded.body.imageUrl as string;

      const filePath = storedFilePath(url);

      await request(app.getHttpServer())
        .delete(`/products/${id}/image`)
        .set('Cookie', authCookie)
        .expect(204);

      const product = await getProduct(id);
      expect(product.body.imageUrl).toBeNull();
      expect(await pathExists(filePath)).toBe(false);
    });

    it('is idempotent when the product has no image', async () => {
      const id = await createProduct('DELETE-NONE');
      const res = await request(app.getHttpServer())
        .delete(`/products/${id}/image`)
        .set('Cookie', authCookie)
        .expect(204);
      expect(res.body).toEqual({});
    });

    it('returns 404 for a missing product', async () => {
      const res = await request(app.getHttpServer())
        .delete('/products/does-not-exist/image')
        .set('Cookie', authCookie)
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('returns 401 without a session cookie', async () => {
      const id = await createProduct('DELETE-NOAUTH');
      await uploadImage(id, JPEG_BYTES).expect(200);
      const res = await request(app.getHttpServer())
        .delete(`/products/${id}/image`)
        .expect(401);
      expect(res.body).toMatchObject({ statusCode: 401 });
    });
  });

  describe('Deleting a product with an image', () => {
    it('deletes the product and its image file', async () => {
      const id = await createProduct('PRODUCT-DELETE');
      const uploaded = await uploadImage(id, JPEG_BYTES).expect(200);
      const url = uploaded.body.imageUrl as string;

      const filePath = storedFilePath(url);
      expect(await pathExists(filePath)).toBe(true);

      await request(app.getHttpServer())
        .delete(`/products/${id}`)
        .set('Cookie', authCookie)
        .expect(204);

      await request(app.getHttpServer()).get(`/products/${id}`).expect(404);
      expect(await pathExists(filePath)).toBe(false);
    });
  });

  describe('Security', () => {
    it('rejects SVG (image/svg+xml)', async () => {
      const id = await createProduct('SVG');
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      const res = await uploadImage(id, svg, {
        filename: 'x.svg',
        contentType: 'image/svg+xml',
      }).expect(400);
      expect(res.body).toMatchObject({ statusCode: 400 });
    });

    it('rejects HTML', async () => {
      const id = await createProduct('HTML');
      const html = Buffer.from('<!DOCTYPE html><html></html>');
      const res = await uploadImage(id, html, {
        filename: 'x.html',
        contentType: 'text/html',
      }).expect(400);
      expect(res.body).toMatchObject({ statusCode: 400 });
    });

    it('rejects JavaScript', async () => {
      const id = await createProduct('JS');
      const js = Buffer.from('alert(1)');
      const res = await uploadImage(id, js, {
        filename: 'x.js',
        contentType: 'application/javascript',
      }).expect(400);
      expect(res.body).toMatchObject({ statusCode: 400 });
    });

    it('rejects non-image content even with an allowed MIME type', async () => {
      const id = await createProduct('SPOOFED');
      const svgSpoofed = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      const res = await uploadImage(id, svgSpoofed, {
        filename: 'x.png',
        contentType: 'image/png',
      }).expect(400);
      expect(res.body).toMatchObject({ statusCode: 400 });
    });

    it('never returns absolute filesystem paths', async () => {
      const id = await createProduct('NO-ABS-PATH');
      const uploaded = await uploadImage(id, WEBP_BYTES).expect(200);
      const url = uploaded.body.imageUrl as string;
      expect(url).toMatch(/^\/uploads\/products\/[0-9a-f-]{36}\.webp$/);
      expect(url).not.toContain('\\');
      expect(url).not.toContain(':');
      expect(url).not.toContain(uploadDir);
      expect(url.startsWith('/uploads/products/')).toBe(true);
    });
  });
});
