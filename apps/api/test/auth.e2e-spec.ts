import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AppModule } from '../src/app.module.js';

const ADMIN = {
  username: 'e2e-admin',
  email: 'e2e-admin@example.com',
  password: 's3cure-passw0rd',
};

function getCookie(setCookieHeader: readonly string[] | undefined): string {
  if (!setCookieHeader || setCookieHeader.length === 0) {
    throw new Error('Expected a Set-Cookie header');
  }
  return setCookieHeader[0].split(';')[0];
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sessionCookie: string;

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
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  it('POST /auth/setup creates the admin with no users present', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/setup')
      .send(ADMIN)
      .expect(201);

    expect(res.body).toEqual({
      id: expect.any(String),
      username: ADMIN.username,
      email: ADMIN.email,
    });
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.headers['set-cookie']).toBeDefined();
    sessionCookie = getCookie(res.headers['set-cookie'] as string[]);
  });

  it('POST /auth/setup is blocked once a user exists', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/setup')
      .send({ ...ADMIN, email: 'another-admin@example.com' })
      .expect(403);

    expect(res.body).toMatchObject({ statusCode: 403 });
  });

  it('POST /auth/setup validates input (invalid email, short password)', async () => {
    await request(app.getHttpServer())
      .post('/auth/setup')
      .send({ username: 'x', email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('POST /auth/login rejects wrong credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN.email, password: 'wrong-password' })
      .expect(401);

    expect(res.body).toMatchObject({ statusCode: 401 });
  });

  it('POST /auth/login does not reveal whether the email exists', async () => {
    const unknown = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: ADMIN.password })
      .expect(401);

    expect(unknown.body).toMatchObject({ statusCode: 401 });
  });

  it('POST /auth/login accepts valid credentials and sets a cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN.email, password: ADMIN.password })
      .expect(200);

    expect(res.body).toEqual({
      id: expect.any(String),
      username: ADMIN.username,
      email: ADMIN.email,
    });
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.headers['set-cookie']).toBeDefined();
    sessionCookie = getCookie(res.headers['set-cookie'] as string[]);
  });

  it('GET /auth/me is denied without a cookie', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me').expect(401);
    expect(res.body).toMatchObject({ statusCode: 401 });
  });

  it('GET /auth/me returns the authenticated user with a valid cookie', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body).toEqual({
      id: expect.any(String),
      username: ADMIN.username,
      email: ADMIN.email,
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('POST /auth/logout invalidates the session', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', sessionCookie)
      .expect(204);

    const expiredCookie = getCookie(res.headers['set-cookie'] as string[]);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', expiredCookie)
      .expect(401);
  });
});
