import { constants } from 'node:fs';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FileStorage } from './file-storage.js';

export class LocalFileStorage implements FileStorage {
  readonly provider = 'local' as const;

  private readonly rootDirectory: string;

  constructor(uploadDirectory: string) {
    this.rootDirectory = path.resolve(uploadDirectory);
  }

  async put(key: string, body: Buffer): Promise<void> {
    const absolutePath = this.absolutePath(key);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, body, { flag: 'wx' });
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.absolutePath(key));
  }

  async delete(key: string): Promise<void> {
    const absolutePath = this.absolutePath(key);
    try {
      await unlink(absolutePath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.absolutePath(key), constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private absolutePath(key: string): string {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9/._-]{0,500}$/.test(key)) {
      throw new Error('Invalid storage key');
    }
    const absolutePath = path.resolve(this.rootDirectory, key);
    const relativePath = path.relative(this.rootDirectory, absolutePath);
    if (
      relativePath === '' ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      throw new Error('Storage key escapes the configured upload directory');
    }
    return absolutePath;
  }
}
