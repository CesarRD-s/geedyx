/**
 * Allowed image formats for product uploads. Only these three are accepted, on
 * purpose: JPEG, PNG and WebP. SVG is deliberately excluded to reduce the
 * stored-content attack surface (see docs/DECISIONS.md ADR-006 and ADR-007).
 */
export const ALLOWED_IMAGE_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export type DetectedImageFormat = 'jpeg' | 'png' | 'webp';

export const IMAGE_FORMAT_EXTENSION: Record<DetectedImageFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

/**
 * Content sniffing based on magic bytes. The MIME type sent by the browser is
 * never trusted on its own: the real file header decides whether an upload is
 * an actual JPEG, PNG, or WebP image. Only the first few bytes are inspected,
 * so no image processing library is required.
 */
export function detectImageFormat(buffer: Buffer): DetectedImageFormat | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpeg';
  }

  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(pngSignature)) {
    return 'png';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('latin1', 0, 4) === 'RIFF' &&
    buffer.toString('latin1', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}
