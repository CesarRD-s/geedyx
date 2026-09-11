const SECONDS_IN = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86_400,
};

const DEFAULT_SESSION_SECONDS = SECONDS_IN.h;

export function durationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) {
    return DEFAULT_SESSION_SECONDS;
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase() as keyof typeof SECONDS_IN;
  return value * SECONDS_IN[unit];
}

export function durationToMs(duration: string): number {
  return durationToSeconds(duration) * 1000;
}