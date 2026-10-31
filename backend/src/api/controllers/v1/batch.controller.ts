import type { Request, Response } from "express";
import { batchService } from "../../../services/batch.service";
import { sendSuccess } from "../../../utils/response";
import type { AdminBatchesQuery, CreateBatchBody, UpdateBatchBody } from "../../validators/v1/batch.validator";

export const batchController = {
  async listForAdmin(req: Request, res: Response) {
    const { items, meta } = await batchService.listForAdmin(req.valid.query as AdminBatchesQuery);
    sendSuccess(res, items, { meta });
  },

  async create(req: Request, res: Response) {
    const batch = await batchService.create(req.valid.params.courseId as string, req.valid.body as CreateBatchBody);
    sendSuccess(res, batch, { status: 201, message: "নতুন ব্যাচ যুক্ত হয়েছে" });
  },

  async update(req: Request, res: Response) {
    const batch = await batchService.update(req.valid.params.id as string, req.valid.body as UpdateBatchBody);
    sendSuccess(res, batch, { message: "ব্যাচ হালনাগাদ হয়েছে" });
  },

  async remove(req: Request, res: Response) {
    await batchService.remove(req.valid.params.id as string);
    sendSuccess(res, null, { message: "ব্যাচ মুছে ফেলা হয়েছে" });
  },
};
