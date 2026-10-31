import type { Request, Response } from "express";
import { uploadService } from "../../../services/upload.service";
import { AppError } from "../../../utils/AppError";
import { sendSuccess } from "../../../utils/response";
import type { UploadFileBody, VideoCompleteBody, VideoUploadUrlBody } from "../../validators/v1/upload.validator";

export const uploadController = {
  async uploadFile(req: Request, res: Response) {
    if (!req.file) throw new AppError("VALIDATION_ERROR", 400, [{ field: "file", message: "File is required" }]);
    const { folder } = req.valid.body as UploadFileBody;
    const result = await uploadService.uploadFile(req.file, folder);
    sendSuccess(res, result, { status: 201 });
  },

  async createVideoUploadUrl(req: Request, res: Response) {
    const result = await uploadService.createVideoUploadUrl(req.valid.body as VideoUploadUrlBody);
    sendSuccess(res, result, { status: 201 });
  },

  async confirmVideoUpload(req: Request, res: Response) {
    const { key } = req.valid.body as VideoCompleteBody;
    const result = await uploadService.confirmVideoUpload(key);
    sendSuccess(res, result);
  },
};
