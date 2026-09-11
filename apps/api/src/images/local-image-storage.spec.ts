import { constants } from 'node:fs';
import { access, mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LocalImageStorage } from './local-image-storage.js';

describe('LocalImageStorage', () => {
  let tempDir: string;
  let storage: LocalImageStorage;

  const config = {
    get: () => tempDir,
  };

  function absolutePath(publicUrl: string): string {
    return path.join(tempDir, 'products', path.basename(publicUrl));
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'geedyx-img-'));
    storage = new LocalImageStorage(config);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('save', () => {
    it('writes the buffer to disk and returns a public URL', async () => {
      const content = Buffer.from('fake-jpeg-bytes');
      const url = await storage.save(content, 'jpg');

      expect(url).toMatch(/^\/uploads\/products\/[0-9a-f-]{36}\.jpg$/);
      const stored = await access(absolutePath(url), constants.F_OK);
      expect(stored).toBeUndefined();
      const onDisk = await import('node:fs/promises').then((m) =>
        m.readFile(absolutePath(url)),
      );
      expect(onDisk.equals(content)).toBe(true);
    });

    it('creates the products directory when missing', async () => {
      const url = await storage.save(Buffer.from('bytes'), 'png');
      await expect(access(absolutePath(url), constants.F_OK)).resolves.toBeUndefined();
    });

    it('generates a unique name for every save', async () => {
      const first = await storage.save(Buffer.from('a'), 'jpg');
      const second = await storage.save(Buffer.from('a'), 'jpg');
      expect(first).not.toBe(second);
    });
  });

  describe('exists', () => {
    it('returns true for a saved URL and false for unknown URLs', async () => {
      const url = await storage.save(Buffer.from('bytes'), 'webp');
      expect(await storage.exists(url)).toBe(true);
      expect(
        await storage.exists('/uploads/products/00000000-0000-0000-0000-000000000000.webp'),
      ).toBe(false);
    });

    it('returns false for URLs outside the namespace', async () => {
      expect(await storage.exists('../../secret.txt')).toBe(false);
      expect(await storage.exists('/etc/passwd')).toBe(false);
      expect(await storage.exists('http://evil.com/x.jpg')).toBe(false);
    });
  });

  describe('delete', () => {
    it('removes the file and exists returns false afterwards', async () => {
      const url = await storage.save(Buffer.from('bytes'), 'png');
      await storage.delete(url);
      expect(await storage.exists(url)).toBe(false);
    });

    it('is idempotent for a missing file', async () => {
      await expect(
        storage.delete('/uploads/products/00000000-0000-0000-0000-000000000000.png'),
      ).resolves.toBeUndefined();
    });

    it('does not escape the upload directory', async () => {
      const outside = path.join(tempDir, '..', 'escaped.txt');
      const url = await storage.save(Buffer.from('bytes'), 'jpg');
      await storage.delete(url);
      const remaining = await readdir(path.join(tempDir, 'products'));
      expect(remaining).toHaveLength(0);
      expect(outside).not.toBe(path.join(tempDir, 'products', 'escaped.txt'));
    });
  });
});