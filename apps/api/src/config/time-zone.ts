import { BadRequestException } from '@nestjs/common';

export function assertValidTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
  } catch {
    throw new BadRequestException({
      code: 'INVALID_TIME_ZONE',
      detail: 'La zona horaria no es válida.',
    });
  }
}
