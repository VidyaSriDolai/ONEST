import type { ApiErrorCode, ApiResponse } from '@skillseal/shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/** Mirrors the API's error envelope so forms can map messages onto fields. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the failure is worth retrying after a token refresh. */
  get isAuthExpiry(): boolean {
    return this.code === 'SESSION_EXPIRED';
  }
}

/**
 * The access token is held in a module-level variable rather than
 * localStorage. It never touches disk, so an XSS payload cannot read it back
 * later, and it disappears when the tab closes. Durable sessions come from the
 * httpOnly refresh cookie instead.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Called when refreshing fails, so the app can drop back to signed-out state. */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler = () => {};

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skips the refresh-and-retry cycle; used by the refresh call itself. */
  skipRefresh?: boolean;
}

async function parse<T>(response: Response): Promise<T> {
  let payload: ApiResponse<T> | null = null;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // A non-JSON response means something upstream failed (proxy, gateway).
    throw new ApiError(
      response.status,
      'INTERNAL_ERROR',
      'The server returned an unexpected response. Please try again.',
    );
  }

  if (!payload.ok) {
    throw new ApiError(
      response.status,
      payload.error.code,
      payload.error.message,
      payload.error.details,
    );
  }

  return payload.data;
}

/**
 * A single in-flight refresh is shared by every waiting request, so a burst of
 * calls arriving on an expired token triggers one refresh, not several.
 */
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const response = await fetch(BASE_URL + '/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) return false;

      const data = await parse<{ accessToken: string }>(response);
      setAccessToken(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipRefresh, headers, ...rest } = options;

  const send = (): Promise<Response> =>
    fetch(BASE_URL + path, {
      ...rest,
      // Required for the httpOnly refresh cookie to be sent and set.
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await send();

  // 401 with SESSION_EXPIRED means the access token aged out mid-session.
  // Refresh once, transparently, and replay the original request.
  if (response.status === 401 && !skipRefresh) {
    const clone = response.clone();
    let expired = false;
    try {
      const payload = (await clone.json()) as ApiResponse<never>;
      expired = !payload.ok && payload.error.code === 'SESSION_EXPIRED';
    } catch {
      expired = false;
    }

    if (expired) {
      if (await refreshSession()) {
        response = await send();
      } else {
        setAccessToken(null);
        onUnauthorized();
      }
    }
  }

  return parse<T>(response);
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

export { refreshSession };
