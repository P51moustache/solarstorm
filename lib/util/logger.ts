/**
 * Production-safe logging utility
 *
 * In development: logs to console
 * In production: suppresses logs (or could send to monitoring service)
 */

const isDev = process.env.NODE_ENV === 'development';

// Redact sensitive information from error messages
function redactSensitiveInfo(message: string): string {
  return message
    // Redact API keys
    .replace(/api_key=[^&\s]+/gi, 'api_key=[REDACTED]')
    .replace(/apikey=[^&\s]+/gi, 'apikey=[REDACTED]')
    .replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
    // Redact tokens
    .replace(/token=[^&\s]+/gi, 'token=[REDACTED]')
    .replace(/bearer\s+[^\s]+/gi, 'bearer [REDACTED]')
    // Redact email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
    // Redact UUIDs (user IDs, etc.)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID_REDACTED]');
}

function formatMessage(message: string, ...args: unknown[]): string {
  let formatted = message;
  args.forEach((arg, i) => {
    if (typeof arg === 'object') {
      try {
        formatted += ` ${JSON.stringify(arg)}`;
      } catch {
        formatted += ` [Object]`;
      }
    } else {
      formatted += ` ${arg}`;
    }
  });
  return isDev ? formatted : redactSensitiveInfo(formatted);
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[DEBUG] ${formatMessage(message, ...args)}`);
    }
  },

  info: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.info(`[INFO] ${formatMessage(message, ...args)}`);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.warn(`[WARN] ${formatMessage(message, ...args)}`);
    }
    // In production, could send to monitoring service
  },

  error: (message: string, error?: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error || '');
    const formattedMessage = formatMessage(message, errorMessage);

    if (isDev) {
      console.error(`[ERROR] ${formattedMessage}`);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    } else {
      // In production, only log a sanitized version
      // In a real app, send to Sentry, DataDog, etc.
      console.error(`[ERROR] ${redactSensitiveInfo(message)}`);
    }
  },
};

export default logger;
