import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export function createOpaqueToken(): string {
  return randomBytes(32).toString('hex');
}

const TEMPORARY_PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
const TEMPORARY_PASSWORD_UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const TEMPORARY_PASSWORD_DIGITS = '23456789';
const TEMPORARY_PASSWORD_SYMBOLS = '!@#$%^&*';

function randomCharacter(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)] ?? '';
}

export function createTemporaryPassword(): string {
  const characters = [
    randomCharacter(TEMPORARY_PASSWORD_UPPERCASE),
    randomCharacter(TEMPORARY_PASSWORD_DIGITS),
    randomCharacter(TEMPORARY_PASSWORD_SYMBOLS),
  ];
  while (characters.length < 16) {
    characters.push(randomCharacter(TEMPORARY_PASSWORD_ALPHABET));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [characters[index], characters[swapIndex]] = [
      characters[swapIndex] ?? '',
      characters[index] ?? '',
    ];
  }

  return characters.join('');
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};

  return Object.fromEntries(
    cookieHeader.split(';').flatMap((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return [];

      const name = part.slice(0, separator).trim();
      const rawValue = part.slice(separator + 1).trim();
      if (!name) return [];

      try {
        return [[name, decodeURIComponent(rawValue)]];
      } catch {
        return [[name, rawValue]];
      }
    }),
  );
}

export function tokensMatch(
  left: string | undefined,
  right: string | undefined,
): boolean {
  if (!left || !right) return false;

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;

  return timingSafeEqual(leftBuffer, rightBuffer);
}
