interface HttpContext {
  get: (url: string, options?: RequestInit) => Promise<Response>;
  post: (url: string, body: unknown, options?: RequestInit) => Promise<Response>;
  put: (url: string, body: unknown, options?: RequestInit) => Promise<Response>;
  delete: (url: string, options?: RequestInit) => Promise<Response>;
}

function mergeHeaders(
  baseHeaders: Headers,
  options?: RequestInit,
): Headers {
  if (options?.headers) {
    const extraHeaders =
      options.headers instanceof Headers
        ? options.headers
        : new Headers(options.headers);

    extraHeaders.forEach((value, key) => {
      baseHeaders.set(key, value);
    });
  }
  return baseHeaders;
}

/**
 * Build HTTP context methods for the transformer engine.
 * Provides GET, POST, PUT, DELETE with proper JSON handling.
 */
export function createHttpContext(): HttpContext {
  return {
    get: (url: string, options?: RequestInit) =>
      fetch(url, { ...options, method: 'GET' }),

    post: (url: string, body: unknown, options?: RequestInit) => {
      const headers = mergeHeaders(
        new Headers({ 'Content-Type': 'application/json' }),
        options,
      );
      return fetch(url, {
        ...options,
        method: 'POST',
        body: JSON.stringify(body),
        headers,
      });
    },

    put: (url: string, body: unknown, options?: RequestInit) => {
      const headers = mergeHeaders(
        new Headers({ 'Content-Type': 'application/json' }),
        options,
      );
      return fetch(url, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(body),
        headers,
      });
    },

    delete: (url: string, options?: RequestInit) =>
      fetch(url, { ...options, method: 'DELETE' }),
  };
}
