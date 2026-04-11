import type { Database } from "./types";

type QueryAction = "select" | "insert" | "update" | "delete" | "upsert";

type QueryFilterOperator = "eq" | "in" | "gt" | "gte" | "lt" | "lte";

type QueryFilter = {
  column: string;
  operator: QueryFilterOperator;
  value: unknown;
};

type QueryOrder = {
  column: string;
  ascending: boolean;
};

type QueryPayload = {
  table: string;
  action: QueryAction;
  select?: string;
  filters?: QueryFilter[];
  order?: QueryOrder[];
  limit?: number | null;
  single?: boolean;
  maybeSingle?: boolean;
  count?: "exact" | null;
  head?: boolean;
  values?: unknown;
  onConflict?: string;
  returning?: boolean;
};

type QueryResponse<T = unknown> = {
  data: T;
  error: { message: string; code?: string } | null;
  count: number | null;
};

type LocalApiError = {
  message: string;
  code?: string;
};

type LocalSession = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
    username?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    aud?: string;
    created_at?: string;
  };
};

type LocalAdminUser = {
  id: string;
  username: string;
  role: string;
  must_change_password: boolean;
  created_at: string;
  updated_at?: string;
  password_changed_at?: string | null;
};

const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || "http://127.0.0.1:8787";
const SESSION_STORAGE_KEY = "sqlite_local_session";

function normalizeError(payload: unknown, fallback: string): LocalApiError {
  const topLevelCode =
    payload && typeof payload === "object" && typeof (payload as { code?: unknown }).code === "string"
      ? String((payload as { code: string }).code)
      : undefined;

  if (payload && typeof payload === "object" && "error" in payload) {
    const raw = (payload as { error?: unknown }).error;
    if (typeof raw === "string") return { message: raw, code: topLevelCode };
    if (raw && typeof raw === "object" && "message" in raw) {
      const nestedCode = typeof (raw as { code?: unknown }).code === "string"
        ? String((raw as { code: string }).code)
        : topLevelCode;
      return { message: String((raw as { message?: unknown }).message || fallback), code: nestedCode };
    }
  }
  return { message: fallback, code: topLevelCode };
}

function toLocalApiError(error: unknown, fallback = "Request failed"): LocalApiError {
  if (error && typeof error === "object") {
    const message = typeof (error as { message?: unknown }).message === "string"
      ? String((error as { message: string }).message)
      : fallback;
    const code = typeof (error as { code?: unknown }).code === "string"
      ? String((error as { code: string }).code)
      : undefined;
    return { message, code };
  }
  if (typeof error === "string" && error.trim()) {
    return { message: error };
  }
  return { message: fallback };
}

function loadSession(): LocalSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

function saveSession(session: LocalSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

type AuthListener = (event: string, session: LocalSession | null) => void;
const authListeners = new Set<AuthListener>();

function emitAuthEvent(event: string, session: LocalSession | null) {
  for (const listener of authListeners) {
    listener(event, session);
  }
}

async function requestLocalApi<T = unknown>(path: string, init: RequestInit = {}, withAuth = true): Promise<T> {
  const headers = new Headers(init.headers || {});
  const session = loadSession();

  if (withAuth && session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(`${LOCAL_API_URL}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  let payload: unknown = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!response.ok) {
    throw normalizeError(payload, `Request failed (${response.status})`);
  }

  return payload as T;
}

class LocalQueryBuilder<T = unknown> {
  private readonly table: string;
  private action: QueryAction = "select";
  private selected = "*";
  private filters: QueryFilter[] = [];
  private orderBy: QueryOrder[] = [];
  private rowLimit: number | null = null;
  private values: unknown = null;
  private onConflict = "";
  private wantsSingle = false;
  private wantsMaybeSingle = false;
  private wantsCount: "exact" | null = null;
  private wantsHead = false;
  private wantsReturning = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.selected = columns;

    if (this.action === "select") {
      this.wantsCount = options?.count ?? null;
      this.wantsHead = Boolean(options?.head);
    } else {
      this.wantsReturning = true;
    }

    return this;
  }

  insert(values: unknown) {
    this.action = "insert";
    this.values = values;
    return this;
  }

  upsert(values: unknown, options?: { onConflict?: string }) {
    this.action = "upsert";
    this.values = values;
    this.onConflict = options?.onConflict || "";
    return this;
  }

  update(values: unknown) {
    this.action = "update";
    this.values = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: "eq", value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ column, operator: "in", value });
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push({ column, operator: "gt", value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, operator: "gte", value });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ column, operator: "lt", value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ column, operator: "lte", value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy.push({
      column,
      ascending: options?.ascending !== false,
    });
    return this;
  }

  limit(value: number) {
    this.rowLimit = value;
    return this;
  }

  single() {
    this.wantsSingle = true;
    this.wantsMaybeSingle = false;
    return this;
  }

  maybeSingle() {
    this.wantsMaybeSingle = true;
    this.wantsSingle = false;
    return this;
  }

  async execute(): Promise<QueryResponse<T>> {
    const payload: QueryPayload = {
      table: this.table,
      action: this.action,
      select: this.selected,
      filters: this.filters,
      order: this.orderBy,
      limit: this.rowLimit,
      single: this.wantsSingle,
      maybeSingle: this.wantsMaybeSingle,
      count: this.wantsCount,
      head: this.wantsHead,
      values: this.values,
      onConflict: this.onConflict,
      returning: this.wantsReturning,
    };

    try {
      const result = await requestLocalApi<QueryResponse<T>>("/api/db/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      return {
        data: result.data,
        error: result.error,
        count: result.count ?? null,
      };
    } catch (error) {
      return {
        data: null as T,
        error: toLocalApiError(error, "Query failed"),
        count: null,
      };
    }
  }

  then<TResult1 = QueryResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

function createNoopChannel() {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
  };
  return channel;
}

export const localDb = {
  from(table: keyof Database["public"]["Tables"] | string) {
    return new LocalQueryBuilder(String(table));
  },
  auth: {
    onAuthStateChange(callback: AuthListener) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            },
          },
        },
      };
    },
    async getSession() {
      const session = loadSession();
      if (!session?.access_token) {
        return { data: { session: null }, error: null };
      }

      try {
        const payload = await requestLocalApi<{ session: LocalSession | null }>("/api/auth/session", {
          method: "GET",
        });
        if (!payload.session) {
          saveSession(null);
          return { data: { session: null }, error: null };
        }
        saveSession(payload.session);
        return { data: { session: payload.session }, error: null };
      } catch (error) {
        return {
          data: { session: null },
          error: toLocalApiError(error, "Failed to load session"),
        };
      }
    },
    async getUser() {
      const { data, error } = await this.getSession();
      if (error) {
        return { data: { user: null }, error };
      }
      return { data: { user: data.session?.user ?? null }, error: null };
    },
    async signUp(params: { email: string; password: string; [key: string]: unknown }) {
      try {
        const payload = await requestLocalApi<{ session: LocalSession; user: LocalSession["user"] }>(
          "/api/auth/sign-up",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
          },
          false
        );
        saveSession(payload.session);
        emitAuthEvent("SIGNED_IN", payload.session);
        return { data: { user: payload.user, session: payload.session }, error: null };
      } catch (error) {
        return {
          data: { user: null, session: null },
          error: toLocalApiError(error, "Sign-up is not available"),
        };
      }
    },
    async signInWithPassword(params: { username?: string; email?: string; password: string }) {
      try {
        const payload = await requestLocalApi<{ session: LocalSession; user: LocalSession["user"] }>(
          "/api/auth/sign-in-password",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: params.username ?? params.email ?? "",
              password: params.password,
            }),
          },
          false
        );
        saveSession(payload.session);
        emitAuthEvent("SIGNED_IN", payload.session);
        return { data: { user: payload.user, session: payload.session }, error: null };
      } catch (error) {
        return {
          data: { user: null, session: null },
          error: toLocalApiError(error, "Invalid credentials"),
        };
      }
    },
    async signInWithOAuth() {
      try {
        const payload = await requestLocalApi<{ session: LocalSession; user: LocalSession["user"] }>(
          "/api/auth/sign-in-oauth",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          },
          false
        );
        saveSession(payload.session);
        emitAuthEvent("SIGNED_IN", payload.session);
        return { data: payload, error: null };
      } catch (error) {
        return {
          data: null,
          error: toLocalApiError(error, "OAuth sign-in is not available"),
        };
      }
    },
    async changePasswordFirstLogin(params: { username: string; currentPassword: string; newPassword: string }) {
      try {
        const payload = await requestLocalApi<{ session: LocalSession; user: LocalSession["user"] }>(
          "/api/auth/first-login/change-password",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
          },
          false
        );
        saveSession(payload.session);
        emitAuthEvent("SIGNED_IN", payload.session);
        return { data: { user: payload.user, session: payload.session }, error: null };
      } catch (error) {
        return {
          data: { user: null, session: null },
          error: toLocalApiError(error, "Failed to update password"),
        };
      }
    },
    async changePassword(params: { currentPassword: string; newPassword: string }) {
      try {
        const payload = await requestLocalApi<{ ok: boolean }>(
          "/api/auth/change-password",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
          }
        );
        return { data: payload, error: null };
      } catch (error) {
        return {
          data: { ok: false },
          error: toLocalApiError(error, "Failed to change password"),
        };
      }
    },
    async listUsers() {
      try {
        const payload = await requestLocalApi<{ users: LocalAdminUser[] }>(
          "/api/auth/admin/users",
          {
            method: "GET",
          }
        );
        return { data: payload.users, error: null };
      } catch (error) {
        return {
          data: [] as LocalAdminUser[],
          error: toLocalApiError(error, "Failed to list users"),
        };
      }
    },
    async createUser(params: { username: string; password: string }) {
      try {
        const payload = await requestLocalApi<{ user: LocalAdminUser }>(
          "/api/auth/admin/create-user",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
          }
        );
        return { data: payload.user, error: null };
      } catch (error) {
        return {
          data: null,
          error: toLocalApiError(error, "Failed to create user"),
        };
      }
    },
    async signOut() {
      try {
        await requestLocalApi("/api/auth/sign-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      } catch {
        // ignore
      }
      saveSession(null);
      emitAuthEvent("SIGNED_OUT", null);
      return { error: null };
    },
    async setSession(tokens: Partial<LocalSession>) {
      if (!tokens?.access_token || !tokens?.user) {
        return {
          data: { session: null },
          error: { message: "Invalid local session payload" } as LocalApiError,
        };
      }
      const session = tokens as LocalSession;
      saveSession(session);
      emitAuthEvent("SIGNED_IN", session);
      return { data: { session }, error: null };
    },
  },
  functions: {
    async invoke(name: string, options?: { body?: unknown; headers?: Record<string, string> }) {
      const headers = new Headers(options?.headers || {});
      const body = options?.body;

      if (!(body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }

      const session = loadSession();
      if (session?.access_token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }

      try {
        const response = await fetch(`${LOCAL_API_URL}/functions/v1/${name}`, {
          method: "POST",
          headers,
          body: body instanceof FormData ? body : JSON.stringify(body || {}),
        });

        const text = await response.text();
        const payload = text ? JSON.parse(text) : null;

        if (!response.ok) {
          return {
            data: null,
            error: normalizeError(payload, `Function ${name} failed`),
          };
        }

        return {
          data: payload,
          error: null,
        };
      } catch (error) {
        return {
          data: null,
          error: toLocalApiError(error, `Function ${name} failed`),
        };
      }
    },
  },
  channel(_name?: string) {
    return createNoopChannel();
  },
  removeChannel(_channel?: unknown) {
    return Promise.resolve("ok");
  },
};

