import { z } from "zod";
import { UPLOAD_FOLDERS, VIDEO_FOLDERS, VIDEO_MAX_BYTES, VIDEO_MIME_TYPES } from "../../../services/upload.service";

// POST /admin/uploads (api-spec §12.1) — multipart text field next to `file`.
export const uploadFileBodySchema = z.object({
  folder: z.enum(UPLOAD_FOLDERS),
});

// POST /admin/uploads/video-url (api-spec §12.2)
export const videoUploadUrlBodySchema = z.object({
  folder: z.enum(VIDEO_FOLDERS),
  mimeType: z.enum(VIDEO_MIME_TYPES),
  fileSize: z.number().int().min(1).max(VIDEO_MAX_BYTES),
});

// POST /admin/uploads/video-complete (api-spec §12.3)
export const videoCompleteBodySchema = z.object({
  key: z.string().min(1).max(100),
});

export type UploadFileBody = z.infer<typeof uploadFileBodySchema>;
export type VideoUploadUrlBody = z.infer<typeof videoUploadUrlBodySchema>;
export type VideoCompleteBody = z.infer<typeof videoCompleteBodySchema>;
