import type { Request, Response } from "express";
import { institutionService } from "../../../services/institution.service";
import { sendSuccess } from "../../../utils/response";
import type {
  AdminInstitutionsQuery,
  CreateInstitutionBody,
  InstitutionRequestBody,
  ListInstitutionsQuery,
  UpdateInstitutionBody,
} from "../../validators/v1/institution.validator";

export const institutionController = {
  async list(req: Request, res: Response) {
    const { items, meta } = await institutionService.listPublic(req.valid.query as ListInstitutionsQuery);
    sendSuccess(res, items, { meta });
  },

  async getBySlug(req: Request, res: Response) {
    sendSuccess(res, await institutionService.getPublicBySlug(req.valid.params.slug as string));
  },

  async createRequest(req: Request, res: Response) {
    const data = await institutionService.createRequest(req.valid.body as InstitutionRequestBody);
    sendSuccess(res, data, {
      status: 201,
      message: "আপনার অনুরোধ গৃহীত হয়েছে। ৪৮ ঘণ্টার মধ্যে আমাদের কনসালটেন্সি টিম যোগাযোগ করবে।",
    });
  },

  async listForAdmin(req: Request, res: Response) {
    const { items, meta } = await institutionService.listForAdmin(req.valid.query as AdminInstitutionsQuery);
    sendSuccess(res, items, { meta });
  },

  async getById(req: Request, res: Response) {
    sendSuccess(res, await institutionService.getById(req.valid.params.id as string));
  },

  async create(req: Request, res: Response) {
    const institution = await institutionService.create(req.valid.body as CreateInstitutionBody);
    sendSuccess(res, institution, { status: 201 });
  },

  async update(req: Request, res: Response) {
    const institution = await institutionService.update(
      req.valid.params.id as string,
      req.valid.body as UpdateInstitutionBody,
    );
    sendSuccess(res, institution);
  },

  async remove(req: Request, res: Response) {
    await institutionService.remove(req.valid.params.id as string);
    sendSuccess(res, null, { message: "প্রতিষ্ঠান মুছে ফেলা হয়েছে" });
  },
};
