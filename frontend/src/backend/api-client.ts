import { getApiUrl } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

function getTokens(): { access_token: string; refresh_token: string } | null {
  try {
    const raw = localStorage.getItem("auth_tokens");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setTokens(tokens: Record<string, string>) {
  localStorage.setItem("auth_tokens", JSON.stringify(tokens));
}

function clearTokens() {
  localStorage.removeItem("auth_tokens");
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const tokens = getTokens();
    if (!tokens?.refresh_token) return false;

    try {
      const res = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: tokens.refresh_token }),
      });

      if (!res.ok) {
        clearTokens();
        return false;
      }

      const data = await res.json();
      setTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        access_token_expires_at: data.access_token_expires_at,
        refresh_token_expires_at: data.refresh_token_expires_at,
      });
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false, query } = opts;
  const baseUrl = getApiUrl();

  let url = `${baseUrl}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const tokens = getTokens();
    if (tokens?.access_token) {
      headers["Authorization"] = `Bearer ${tokens.access_token}`;
    }
  }

  let res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newTokens = getTokens();
      if (newTokens?.access_token) {
        headers["Authorization"] = `Bearer ${newTokens.access_token}`;
      }
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    let errorBody: Record<string, unknown> | undefined;
    try {
      errorBody = await res.json();
      if (typeof errorBody?.error === "string") {
        errorMsg = errorBody.error as string;
      }
    } catch {
      // non-JSON error body
    }

    if (res.status === 401) {
      throw new UnauthorizedError(errorMsg);
    }
    throw new ApiError(errorMsg, res.status, errorBody);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  get<T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...opts, method: "GET" });
  },
  post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...opts, method: "POST", body });
  },
  put<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...opts, method: "PUT", body });
  },
  delete<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...opts, method: "DELETE", body });
  },
};
