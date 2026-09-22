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
  let raw = '';

  try {
    raw = await response.text();
    payload = JSON.parse(raw) as ApiResponse<T>;
  } catch {
    // A non-JSON response means something upstream failed. The common case on
    // a static deploy: the API origin is missing and Vite's SPA fallback (or
    // the host's 404 page) answered with index.html.
    if (looksLikeHtml(response, raw)) throw new ApiUnavailableError();
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

/**
 * Thrown when a JSON API call gets HTML back — which on a static deploy means
 * the API is not running behind this origin and the request hit the SPA
 * fallback instead. Extends ApiError so every existing error handler surfaces
 * its actionable message automatically.
 */
export class ApiUnavailableError extends ApiError {
  constructor() {
    super(
      503,
      'INTERNAL_ERROR',
      'The API server is not reachable from this deployment. If you are the operator, set VITE_API_BASE_URL to the API origin and redeploy.',
    );
    this.name = 'ApiUnavailableError';
  }
}

function looksLikeHtml(response: Response, body: string): boolean {
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('text/html') || /^*<!doctype html/i.test(body.trimStart());
}

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
