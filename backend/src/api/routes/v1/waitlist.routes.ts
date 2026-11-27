import { Router } from "express";
import { waitlistController } from "../../controllers/v1/waitlist.controller";
import { authGuard } from "../../middlewares/authGuard";
import { adminOnly } from "../../middlewares/roleGuard";
import { validate } from "../../middlewares/validate";
import { idParamsSchema } from "../../validators/v1/common.validator";
import { adminWaitlistsQuerySchema, joinWaitlistBodySchema, updateWaitlistBodySchema } from "../../validators/v1/waitlist.validator";

// Waitlist for full courses (PRD §3.4.3, api-spec §13 #1). Users join while logged in; the queue
// holds contact details, so only the Super Admin sees it (PRD §2.2: submissions).
export const waitlistRouter = Router();

waitlistRouter.post("/waitlists", authGuard, validate({ body: joinWaitlistBodySchema }), waitlistController.join);
waitlistRouter.get("/waitlists/me", authGuard, waitlistController.listMine);
waitlistRouter.patch("/waitlists/me/:id/cancel", authGuard, validate({ params: idParamsSchema }), waitlistController.cancelMine);

waitlistRouter.get(
  "/admin/waitlists",
  authGuard,
  adminOnly,
  validate({ query: adminWaitlistsQuerySchema }),
  waitlistController.listForAdmin,
);
waitlistRouter.patch(
  "/admin/waitlists/:id",
  authGuard,
  adminOnly,
  validate({ params: idParamsSchema, body: updateWaitlistBodySchema }),
  waitlistController.updateStatus,
);
