export const FILE_STORAGE = Symbol('FILE_STORAGE');

export interface FileStorage {
  readonly provider: 'local' | 's3';

  put(key: string, body: Buffer, mimeType: string): Promise<void>;

  read(key: string): Promise<Buffer>;

  delete(key: string): Promise<void>;
}
