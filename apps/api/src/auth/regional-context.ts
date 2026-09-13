interface RegionalPreferences {
  locale: string | null;
  timeZone: string | null;
}

function validTimeZone(value: string | null): string | null {
  if (!value) return null;
  try {
    new Intl.DateTimeFormat('es', { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

export function resolveRegionalContext(
  user: RegionalPreferences,
  company: RegionalPreferences & { currency: string | null },
) {
  const locale = (value: string | null) =>
    value === 'es' || value === 'en' ? value : null;
  const personalZone = validTimeZone(user.timeZone);
  const companyZone = validTimeZone(company.timeZone);
  return {
    locale: locale(user.locale) ?? locale(company.locale) ?? 'es',
    timeZone: personalZone ?? companyZone ?? 'UTC',
    timeZoneSource: personalZone ? 'user' : companyZone ? 'company' : 'system',
    companyTimeZone: companyZone ?? 'UTC',
    currency: company.currency,
  };
}
