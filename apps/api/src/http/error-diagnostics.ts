type ErrorWithCode = Error & {
  code?: unknown;
  errorCode?: unknown;
};

export function getErrorDiagnostics(error: unknown): Record<string, string> {
  if (!(error instanceof Error)) {
    return { errorName: 'UnknownError' };
  }

  const typedError = error as ErrorWithCode;
  const errorCode =
    typeof typedError.errorCode === 'string'
      ? typedError.errorCode
      : typeof typedError.code === 'string'
        ? typedError.code
        : undefined;

  return {
    errorName: error.name,
    ...(errorCode ? { errorCode } : {}),
  };
}
