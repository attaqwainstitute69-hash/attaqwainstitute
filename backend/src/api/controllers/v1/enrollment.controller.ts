import type { Request, Response } from "express";
import { enrollmentService } from "../../../services/enrollment.service";
import { sendSuccess } from "../../../utils/response";
import type {
  AdminEnrollmentsQuery,
  CreateEnrollmentBody,
  MyEnrollmentsQuery,
  RejectEnrollmentBody,
  ResubmitEnrollmentBody,
} from "../../validators/v1/enrollment.validator";

export const enrollmentController = {
  async create(req: Request, res: Response) {
    const body = req.valid.body as CreateEnrollmentBody;
    const enrollment = await enrollmentService.create({ ...body, userId: req.user!.userId });
    sendSuccess(res, enrollment, {
      status: 201,
      message: "আপনার আবেদন জমা হয়েছে। পেমেন্ট যাচাইয়ের পর নিশ্চিত করা হবে।",
    });
  },

  async listMine(req: Request, res: Response) {
    const { status } = req.valid.query as MyEnrollmentsQuery;
    sendSuccess(res, await enrollmentService.listMine(req.user!.userId, status));
  },

  async getMine(req: Request, res: Response) {
    sendSuccess(res, await enrollmentService.getMine(req.user!.userId, req.valid.params.id as string));
  },

  async resubmit(req: Request, res: Response) {
    const enrollment = await enrollmentService.resubmit(
      req.user!.userId,
      req.valid.params.id as string,
      req.valid.body as ResubmitEnrollmentBody,
    );
    sendSuccess(res, enrollment, { message: "নতুন TrxID জমা হয়েছে। পেমেন্ট যাচাইয়ের পর নিশ্চিত করা হবে।" });
  },

  async listForAdmin(req: Request, res: Response) {
    const { items, meta } = await enrollmentService.listForAdmin(req.valid.query as AdminEnrollmentsQuery);
    sendSuccess(res, items, { meta });
  },

  async approve(req: Request, res: Response) {
    const result = await enrollmentService.approve(req.valid.params.id as string, req.user!.userId);
    sendSuccess(res, result, {
      message: result.warnings
        ? "এনরোলমেন্ট অনুমোদিত হয়েছে, কিন্তু ইমেইল পাঠানো যায়নি"
        : "এনরোলমেন্ট অনুমোদিত হয়েছে এবং ইমেইল পাঠানো হয়েছে",
    });
  },

  async reject(req: Request, res: Response) {
    const { rejectionReason } = req.valid.body as RejectEnrollmentBody;
    const enrollment = await enrollmentService.reject(req.valid.params.id as string, req.user!.userId, rejectionReason);
    sendSuccess(res, enrollment, { message: "এনরোলমেন্ট বাতিল করা হয়েছে" });
  },
};
