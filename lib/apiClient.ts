// fetch-обёртка для client components: JSON туда-обратно, ошибки API → ApiError с кодом.

import type { ApiErrorDTO } from "./dto";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (hasBody ? "POST" : "GET"),
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз");
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ApiErrorDTO | null)?.error;
    throw new ApiError(res.status, err?.code ?? "UNKNOWN", err?.message ?? "Ошибка сервера, попробуйте ещё раз");
  }
  return data as T;
}

export const errorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : "Что-то пошло не так, попробуйте ещё раз";
