import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LocalFileStorage } from './local-file-storage.js';

describe('LocalFileStorage', () => {
  let directory: string;
  let storage: LocalFileStorage;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'geedyx-files-'));
    storage = new LocalFileStorage(directory);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('keeps files private while supporting an opaque nested key', async () => {
    const key = 'companies/company-1/images/image-1.jpg';
    const body = Buffer.from('private-image');

    await storage.put(key, body, 'image/jpeg');

    await expect(storage.read(key)).resolves.toEqual(body);
    await expect(storage.exists(key)).resolves.toBe(true);
  });

  it('rejects keys that escape the configured storage root', async () => {
    await expect(storage.put('../secret.txt', Buffer.from('x'), 'text/plain'))
      .rejects.toThrow('Invalid storage key');
  });

  it('deletes a file idempotently', async () => {
    const key = 'companies/company-1/images/image-1.png';
    await storage.put(key, Buffer.from('image'), 'image/png');

    await storage.delete(key);
    await storage.delete(key);

    await expect(storage.exists(key)).resolves.toBe(false);
  });
});
