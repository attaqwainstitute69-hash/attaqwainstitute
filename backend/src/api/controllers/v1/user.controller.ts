import type { Request, Response } from "express";
import { userService } from "../../../services/user.service";
import { sendSuccess } from "../../../utils/response";
import type { AdminUsersQuery, UpdateMeBody, UpdateRoleBody } from "../../validators/v1/user.validator";

export const userController = {
  async updateMe(req: Request, res: Response) {
    const user = await userService.updateMe(req.user!.userId, req.valid.body as UpdateMeBody);
    sendSuccess(res, user, { message: "প্রোফাইল আপডেট হয়েছে" });
  },

  async listForAdmin(req: Request, res: Response) {
    const { items, meta } = await userService.listForAdmin(req.valid.query as AdminUsersQuery);
    sendSuccess(res, items, { meta });
  },

  async getForAdmin(req: Request, res: Response) {
    sendSuccess(res, await userService.getForAdmin(req.valid.params.id as string));
  },

  async updateRole(req: Request, res: Response) {
    const { role } = req.valid.body as UpdateRoleBody;
    const user = await userService.updateRole(req.valid.params.id as string, role, req.user!.userId);
    sendSuccess(res, user, { message: "রোল পরিবর্তন করা হয়েছে" });
  },
};
