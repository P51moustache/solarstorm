export interface FetchJsonOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public status?: number,
    public url?: string
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

export async function fetchJson<T = any>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<T> {
  const {
    timeout = 10000,
    retries = 2,
    retryDelay = 1000,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          url
        );
      }

      const data = await response.json();
      return data as T;

    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof FetchError && error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Wait before retrying (except on last attempt)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Unknown fetch error');
}

export async function fetchText(
  url: string,
  options: FetchJsonOptions = {}
): Promise<string> {
  const {
    timeout = 10000,
    retries = 2,
    retryDelay = 1000,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          url
        );
      }

      return await response.text();

    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof FetchError && error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Unknown fetch error');
}
