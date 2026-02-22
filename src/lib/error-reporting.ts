interface ErrorContext {
  userId?: number;
  route?: string;
  [key: string]: unknown;
}

export function captureException(error: unknown, context?: ErrorContext): void {
  // In production, this would send to Sentry/DataDog/etc.
  // For now, structured logging with full context
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(
    JSON.stringify({
      type: 'unhandled_error',
      message: errorMessage,
      stack: errorStack,
      ...context,
      timestamp: new Date().toISOString(),
    }),
  );
}

export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: ErrorContext,
): void {
  console.log(
    JSON.stringify({
      type: 'captured_message',
      level,
      message,
      ...context,
      timestamp: new Date().toISOString(),
    }),
  );
}
