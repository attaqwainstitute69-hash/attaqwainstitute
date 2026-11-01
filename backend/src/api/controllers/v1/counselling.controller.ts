import type { Request, Response } from "express";
import { counsellingService } from "../../../services/counselling.service";
import { sendSuccess } from "../../../utils/response";
import type {
  AssignCounsellorBody,
  CounsellingListQuery,
  CounsellingRequestBody,
  UpdateCounsellingBody,
} from "../../validators/v1/counselling.validator";

export const counsellingController = {
  // Echoes nothing sensitive back (api-spec §9.1).
  async create(req: Request, res: Response) {
    const data = await counsellingService.create(req.valid.body as CounsellingRequestBody);
    sendSuccess(res, data, {
      status: 201,
      message: "আপনার অনুরোধ গোপনীয়ভাবে গৃহীত হয়েছে। একজন কাউন্সেলর শীঘ্রই যোগাযোগ করবেন।",
    });
  },

  async list(req: Request, res: Response) {
    const { items, meta } = await counsellingService.list(req.user!, req.valid.query as CounsellingListQuery);
    sendSuccess(res, items, { meta });
  },

  async getById(req: Request, res: Response) {
    sendSuccess(res, await counsellingService.getById(req.user!, req.valid.params.id as string));
  },

  async assign(req: Request, res: Response) {
    const { counsellorId } = req.valid.body as AssignCounsellorBody;
    const request = await counsellingService.assign(req.valid.params.id as string, counsellorId);
    sendSuccess(res, request, { message: "কাউন্সেলর নির্ধারণ করা হয়েছে" });
  },

  async update(req: Request, res: Response) {
    const request = await counsellingService.update(
      req.user!,
      req.valid.params.id as string,
      req.valid.body as UpdateCounsellingBody,
    );
    sendSuccess(res, request);
  },
};
