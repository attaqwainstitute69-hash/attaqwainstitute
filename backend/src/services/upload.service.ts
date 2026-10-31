import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ulid } from "ulid";
import { r2 } from "../config/r2";
import { AppError } from "../utils/AppError";
import { detectFileType } from "../utils/fileType";

// Upload rules (api-spec §12). Images and PDFs go through the API; videos go straight from the
// browser to R2 with a presigned URL, so large files never pass through Express.
export const UPLOAD_FOLDERS = ["courses", "blog", "trainers", "institutions", "resources", "thumbnails"] as const;
export const VIDEO_FOLDERS = ["courses", "blog"] as const;
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];
export type VideoFolder = (typeof VIDEO_FOLDERS)[number];

const MB = 1024 * 1024;
export const IMAGE_MAX_BYTES = 5 * MB;
export const PDF_MAX_BYTES = 20 * MB;
export const VIDEO_MAX_BYTES = 500 * MB;
// Multer's hard cap — the largest file the API itself accepts.
export const DIRECT_UPLOAD_MAX_BYTES = PDF_MAX_BYTES;

const VIDEO_URL_TTL_SECONDS = 15 * 60;
const VIDEO_EXT: Record<(typeof VIDEO_MIME_TYPES)[number], string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
// Only keys this service generated: <video folder>/<ulid>.<video ext>
const VIDEO_KEY_PATTERN = /^(courses|blog)\/[0-9a-z]{26}\.(mp4|webm|mov)$/;

function storage() {
  if (!r2) throw new AppError("SERVICE_UNAVAILABLE", 503, { reason: "STORAGE_NOT_CONFIGURED" });
  return r2;
}

function newKey(folder: UploadFolder, ext: string) {
  return `${folder}/${ulid().toLowerCase()}.${ext}`;
}

export const uploadService = {
  // POST /admin/uploads — image (all folders) or PDF (resources only).
  async uploadFile(file: { buffer: Buffer; size: number }, folder: UploadFolder) {
    const { client, bucket, publicUrl } = storage();

    const type = detectFileType(file.buffer);
    const isImage = type?.mimeType.startsWith("image/");
    const isPdf = type?.mimeType === "application/pdf";
    if (!type || (!isImage && !(isPdf && folder === "resources"))) {
      throw new AppError("UNSUPPORTED_MEDIA_TYPE", 415, {
        hint: type?.mimeType.startsWith("video/") ? "Use POST /admin/uploads/video-url for videos" : undefined,
      });
    }

    const maxBytes = isImage ? IMAGE_MAX_BYTES : PDF_MAX_BYTES;
    if (file.size > maxBytes) throw new AppError("PAYLOAD_TOO_LARGE", 413, { maxBytes });

    const key = newKey(folder, type.ext);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: type.mimeType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return { url: `${publicUrl}/${key}`, key, fileSize: file.size, mimeType: type.mimeType };
  },

  // POST /admin/uploads/video-url — step 1: presigned PUT. Type and exact size are signed,
  // so R2 rejects a body that differs from what was declared here.
  async createVideoUploadUrl(input: { folder: VideoFolder; mimeType: (typeof VIDEO_MIME_TYPES)[number]; fileSize: number }) {
    const { client, bucket, publicUrl } = storage();

    const key = newKey(input.folder, VIDEO_EXT[input.mimeType]);
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: input.mimeType,
        ContentLength: input.fileSize,
        CacheControl: "public, max-age=31536000, immutable",
      }),
      { expiresIn: VIDEO_URL_TTL_SECONDS },
    );

    return {
      uploadUrl,
      method: "PUT",
      headers: { "Content-Type": input.mimeType },
      key,
      url: `${publicUrl}/${key}`,
      expiresIn: VIDEO_URL_TTL_SECONDS,
    };
  },

  // POST /admin/uploads/video-complete — step 2: check the uploaded object's magic bytes.
  // A file that is not really a video is deleted.
  async confirmVideoUpload(key: string) {
    const { client, bucket, publicUrl } = storage();
    if (!VIDEO_KEY_PATTERN.test(key)) throw new AppError("VALIDATION_ERROR", 400, [{ field: "key", message: "Invalid key" }]);

    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })).catch((err: { name?: string }) => {
      if (err.name === "NotFound") throw new AppError("NOT_FOUND", 404);
      throw err;
    });

    const part = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-63" }));
    const type = detectFileType(await part.Body!.transformToByteArray());

    if (!type?.mimeType.startsWith("video/")) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      throw new AppError("UNSUPPORTED_MEDIA_TYPE", 415);
    }

    return { url: `${publicUrl}/${key}`, key, fileSize: head.ContentLength ?? 0, mimeType: type.mimeType };
  },
};
