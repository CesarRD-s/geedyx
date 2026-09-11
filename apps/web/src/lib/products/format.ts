export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function productImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) {
    return null;
  }
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    return null;
  }
  return `${base}${imageUrl}`;
}