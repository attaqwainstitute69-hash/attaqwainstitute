import { Router } from "express";
import multer from "multer";
import { uploadController } from "../../controllers/v1/upload.controller";
import { authGuard } from "../../middlewares/authGuard";
import { editorOrAdmin } from "../../middlewares/roleGuard";
import { validate } from "../../middlewares/validate";
import { DIRECT_UPLOAD_MAX_BYTES } from "../../../services/upload.service";
import {
  uploadFileBodySchema,
  videoCompleteBodySchema,
  videoUploadUrlBodySchema,
} from "../../validators/v1/upload.validator";

// Memory storage: files are at most 20 MB and go straight to R2. Per-type limits are in upload.service.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DIRECT_UPLOAD_MAX_BYTES, files: 1, fields: 5 },
});

// api-spec §12 — editor uploads for courses, blog and other content.
export const uploadRouter = Router();

uploadRouter.post(
  "/admin/uploads",
  authGuard,
  editorOrAdmin,
  upload.single("file"),
  validate({ body: uploadFileBodySchema }),
  uploadController.uploadFile,
);
uploadRouter.post(
  "/admin/uploads/video-url",
  authGuard,
  editorOrAdmin,
  validate({ body: videoUploadUrlBodySchema }),
  uploadController.createVideoUploadUrl,
);
uploadRouter.post(
  "/admin/uploads/video-complete",
  authGuard,
  editorOrAdmin,
  validate({ body: videoCompleteBodySchema }),
  uploadController.confirmVideoUpload,
);
