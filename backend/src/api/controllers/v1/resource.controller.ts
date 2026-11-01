import type { Request, Response } from "express";
import { resourceService } from "../../../services/resource.service";
import { sendSuccess } from "../../../utils/response";
import type {
  AdminResourcesQuery,
  CreateResourceBody,
  ListResourcesQuery,
  UpdateResourceBody,
} from "../../validators/v1/resource.validator";

export const resourceController = {
  async list(req: Request, res: Response) {
    const { items, meta } = await resourceService.listPublic(req.valid.query as ListResourcesQuery);
    sendSuccess(res, items, { meta });
  },

  async getById(req: Request, res: Response) {
    sendSuccess(res, await resourceService.getPublicById(req.valid.params.id as string));
  },

  async download(req: Request, res: Response) {
    sendSuccess(res, await resourceService.download(req.valid.params.id as string));
  },

  async listForAdmin(req: Request, res: Response) {
    const { items, meta } = await resourceService.listForAdmin(req.valid.query as AdminResourcesQuery);
    sendSuccess(res, items, { meta });
  },

  async getForAdmin(req: Request, res: Response) {
    sendSuccess(res, await resourceService.getById(req.valid.params.id as string));
  },

  async create(req: Request, res: Response) {
    const resource = await resourceService.create(req.valid.body as CreateResourceBody);
    sendSuccess(res, resource, { status: 201 });
  },

  async update(req: Request, res: Response) {
    const resource = await resourceService.update(req.valid.params.id as string, req.valid.body as UpdateResourceBody);
    sendSuccess(res, resource);
  },

  async remove(req: Request, res: Response) {
    await resourceService.remove(req.valid.params.id as string);
    sendSuccess(res, null, { message: "রিসোর্স মুছে ফেলা হয়েছে" });
  },
};
