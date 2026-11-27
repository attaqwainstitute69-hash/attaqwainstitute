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

export type UploadFolder = "courses" | "trainers" | "institutions" | "resources" | "thumbnails";
export type UploadedFile = { url: string; key: string; fileSize: number; mimeType: string };

// POST /admin/uploads (api-spec §12.1): an image, or a PDF in "resources", stored on R2.
export async function apiUpload(
  file: File,
  folder: UploadFolder,
): Promise<ApiResult<UploadedFile>> {
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

// Video upload (api-spec §12.2–12.3): get a presigned URL, PUT the file straight to R2,
// then let the API check that it really is a video. Large files never pass through Express.
export async function apiUploadVideo(file: File, folder: "courses" | "blog" = "courses"): Promise<ApiResult<UploadedFile>> {
  const signed = await apiFetch<{ uploadUrl: string; headers: Record<string, string>; key: string }>("/admin/uploads/video-url", {
    method: "POST",
    body: { folder, mimeType: file.type, fileSize: file.size },
  });
  if (!signed.ok) return signed;
  try {
    const put = await fetch(signed.data.uploadUrl, { method: "PUT", headers: signed.data.headers, body: file });
    if (!put.ok) return { ok: false, code: "UPLOAD_FAILED", message: "" };
  } catch {
    return { ok: false, code: "NETWORK_ERROR", message: "" };
  }
  return apiFetch<UploadedFile>("/admin/uploads/video-complete", { method: "POST", body: { key: signed.data.key } });
}
