import type { Request, Response } from "express";
import { waitlistService } from "../../../services/waitlist.service";
import { sendSuccess } from "../../../utils/response";
import type { AdminWaitlistsQuery, JoinWaitlistBody, UpdateWaitlistBody } from "../../validators/v1/waitlist.validator";

export const waitlistController = {
  async join(req: Request, res: Response) {
    const { courseId } = req.valid.body as JoinWaitlistBody;
    const entry = await waitlistService.join(req.user!.userId, courseId);
    sendSuccess(res, entry, {
      status: 201,
      message: "আপনি ওয়েটলিস্টে যুক্ত হয়েছেন। নতুন ব্যাচ খুললে আমরা যোগাযোগ করব।",
    });
  },

  async listMine(req: Request, res: Response) {
    sendSuccess(res, await waitlistService.listMine(req.user!.userId));
  },

  async cancelMine(req: Request, res: Response) {
    sendSuccess(res, await waitlistService.cancelMine(req.user!.userId, req.valid.params.id as string));
  },

  async listForAdmin(req: Request, res: Response) {
    const { items, meta } = await waitlistService.listForAdmin(req.valid.query as AdminWaitlistsQuery);
    sendSuccess(res, items, { meta });
  },

  async updateStatus(req: Request, res: Response) {
    const { status } = req.valid.body as UpdateWaitlistBody;
    sendSuccess(res, await waitlistService.updateStatus(req.valid.params.id as string, status));
  },
};
