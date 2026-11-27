import type { Request, Response } from "express";
import { reviewService } from "../../../services/review.service";
import { sendSuccess } from "../../../utils/response";
import type {
  AdminReviewsQuery,
  CreateReviewBody,
  EligibilityQuery,
  ListReviewsQuery,
  ModerateReviewBody,
  ReviewSummaryQuery,
} from "../../validators/v1/review.validator";

export const reviewController = {
  async list(req: Request, res: Response) {
    const { items, meta } = await reviewService.listPublic(req.valid.query as ListReviewsQuery);
    sendSuccess(res, items, { meta });
  },

  async summary(req: Request, res: Response) {
    sendSuccess(res, await reviewService.summary(req.valid.query as ReviewSummaryQuery));
  },

  async create(req: Request, res: Response) {
    const review = await reviewService.create(req.user!.userId, req.valid.body as CreateReviewBody);
    sendSuccess(res, review, { status: 201, message: "আপনার রিভিউ পর্যালোচনার জন্য জমা হয়েছে" });
  },

  async listMine(req: Request, res: Response) {
    sendSuccess(res, await reviewService.listMine(req.user!.userId));
  },

  async eligibility(req: Request, res: Response) {
    const { courseId } = req.valid.query as EligibilityQuery;
    sendSuccess(res, await reviewService.eligibility(req.user!.userId, courseId));
  },

  async listForAdmin(req: Request, res: Response) {
    const { items, meta } = await reviewService.listForAdmin(req.valid.query as AdminReviewsQuery);
    sendSuccess(res, items, { meta });
  },

  async moderate(req: Request, res: Response) {
    const { status } = req.valid.body as ModerateReviewBody;
    const review = await reviewService.moderate(req.valid.params.id as string, status, req.user!.userId);
    sendSuccess(res, review, { message: status === "approved" ? "রিভিউ প্রকাশিত হয়েছে" : "রিভিউ বাতিল করা হয়েছে" });
  },
};
