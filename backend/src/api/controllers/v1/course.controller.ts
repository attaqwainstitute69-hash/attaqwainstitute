import type { Request, Response } from "express";
import { courseService } from "../../../services/course.service";
import { sendSuccess } from "../../../utils/response";
import type { CreateCourseBody, ListCoursesQuery, UpdateCourseBody } from "../../validators/v1/course.validator";

// Controllers only map req → service → envelope. Errors bubble to errorHandler (Express 5 forwards rejections).
export const courseController = {
  async list(req: Request, res: Response) {
    const query = req.valid.query as ListCoursesQuery;
    const { items, meta } = await courseService.list(query);
    sendSuccess(res, items, { meta });
  },

  async getBySlug(req: Request, res: Response) {
    const course = await courseService.getBySlug(req.valid.params.slug as string);
    sendSuccess(res, course);
  },

  async getById(req: Request, res: Response) {
    sendSuccess(res, await courseService.getById(req.valid.params.id as string));
  },

  async create(req: Request, res: Response) {
    const course = await courseService.create(req.valid.body as CreateCourseBody);
    sendSuccess(res, course, { status: 201 });
  },

  async update(req: Request, res: Response) {
    const course = await courseService.update(req.valid.params.id as string, req.valid.body as UpdateCourseBody);
    sendSuccess(res, course);
  },

  async remove(req: Request, res: Response) {
    await courseService.remove(req.valid.params.id as string);
    sendSuccess(res, null);
  },
};
