// Browser → Express API. The session is an HTTP-only cookie, so every call sends credentials (api-spec §1.1).
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1").replace(/\/+$/, "");

export type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; code: string; message: string; data?: Record<string, unknown>; details?: unknown };

export async function apiFetch<T>(
  path: string,
  { method = "GET", body, locale = "bn" }: { method?: string; body?: unknown; locale?: string } = {},
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Accept-Language": locale,
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const json = await res.json().catch(() => null);
    if (json?.success) return { ok: true, data: json.data as T, message: json.message };
    return {
      ok: false,
      code: json?.error?.code ?? "INTERNAL_ERROR",
      message: json?.error?.message ?? "",
      details: json?.error?.details,
      data: json?.error?.details && typeof json.error.details === "object" ? json.error.details : undefined,
    };
  } catch {
    return { ok: false, code: "NETWORK_ERROR", message: "" };
  }
}

// POST /admin/uploads (api-spec §12.1): an image, or a PDF in "resources", stored on R2.
export async function apiUpload(
  file: File,
  folder: "institutions" | "resources" | "thumbnails",
): Promise<ApiResult<{ url: string; key: string; fileSize: number; mimeType: string }>> {
  const form = new FormData();
  form.append("folder", folder);
  form.append("file", file);
  try {
    const res = await fetch(`${API_URL}/admin/uploads`, { method: "POST", credentials: "include", headers: { Accept: "application/json" }, body: form });
    const json = await res.json().catch(() => null);
    if (json?.success) return { ok: true, data: json.data };
    return { ok: false, code: json?.error?.code ?? "INTERNAL_ERROR", message: json?.error?.message ?? "" };
  } catch {
    return { ok: false, code: "NETWORK_ERROR", message: "" };
  }
}
