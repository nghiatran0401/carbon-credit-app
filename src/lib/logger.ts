type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context });
  }

  private log(level: LogLevel, message: string, data?: LogContext): void {
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data,
    };

    if (process.env.NODE_ENV === 'production') {
      // Structured JSON in production
      console[level === 'debug' ? 'log' : level](JSON.stringify(entry));
    } else {
      // Human-readable in development
      const prefix = `[${level.toUpperCase()}]`;
      const extra = data ? ` ${JSON.stringify(data)}` : '';
      console[level === 'debug' ? 'log' : level](`${prefix} ${message}${extra}`);
    }
  }

  debug(message: string, data?: LogContext): void {
    this.log('debug', message, data);
  }
  info(message: string, data?: LogContext): void {
    this.log('info', message, data);
  }
  warn(message: string, data?: LogContext): void {
    this.log('warn', message, data);
  }
  error(message: string, data?: LogContext): void {
    this.log('error', message, data);
  }
}

export const logger = new Logger({ service: 'carbon-credit-app' });
export { Logger };
export type { LogContext, LogLevel };
