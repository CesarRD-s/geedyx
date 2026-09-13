export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');

/**
 * Storage abstraction for product images. The interface operates on public
 * URLs (the value stored in `Product.imageUrl`), never on absolute filesystem
 * paths, so the local implementation can later be swapped for remote storage
 * (e.g. Supabase Storage or S3) without changing ProductsService.
 */
export interface ImageStorage {
  /**
   * Persists the raw image bytes and returns the public URL to store in
   * `Product.imageUrl` (e.g. `/uploads/products/<uuid>.<ext>`).
   */
  save(buffer: Buffer, extension: string): Promise<string>;

  /**
   * Removes the file behind a public URL. Missing files are treated as already
   * deleted (idempotent). URLs outside this storage's namespace are ignored.
   */
  delete(publicUrl: string): Promise<void>;

  /** Whether a file exists for a public URL (false for unknown URLs). */
  exists(publicUrl: string): Promise<boolean>;
}
