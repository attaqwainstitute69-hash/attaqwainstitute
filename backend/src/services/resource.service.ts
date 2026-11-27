import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { buildMeta } from "../utils/response";
import { resourceRepository, type ResourceFilter, type ResourceInput } from "../repositories/resource.repository";
import { uploadService } from "./upload.service";

type Paging = { page: number; limit: number };

export const resourceService = {
  async listPublic({ page, limit, ...filter }: Omit<ResourceFilter, "isPublished"> & Paging) {
    const { items, total } = await resourceRepository.listPublic(filter, page, limit);
    return { items, meta: buildMeta(page, limit, total) };
  },

  // Unpublished looks the same as missing (api-spec §11.2).
  async getPublicById(id: string) {
    const resource = await resourceRepository.findPublicById(id);
    if (!resource) throw new AppError("NOT_FOUND", 404);
    return resource;
  },

  async download(id: string) {
    const resource = await resourceRepository.incrementDownloads(id);
    if (!resource) throw new AppError("NOT_FOUND", 404);
    return { fileUrl: resource.fileUrl, downloadsCount: resource.downloadsCount };
  },

  async listForAdmin({ page, limit, ...filter }: ResourceFilter & Paging) {
    const { items, total } = await resourceRepository.listForAdmin(filter, page, limit);
    return { items, meta: buildMeta(page, limit, total) };
  },

  async getById(id: string) {
    const resource = await resourceRepository.findById(id);
    if (!resource) throw new AppError("NOT_FOUND", 404);
    return resource;
  },

  create(input: ResourceInput) {
    return resourceRepository.create(input);
  },

  async update(id: string, update: Partial<ResourceInput>) {
    const resource = await resourceRepository.updateById(id, update);
    if (!resource) throw new AppError("NOT_FOUND", 404);
    return resource;
  },

  // The DB record goes first; a failed R2 delete only leaves an orphan file for the cleanup job
  // (api-spec §1.9.7).
  async remove(id: string) {
    const resource = await resourceRepository.deleteById(id);
    if (!resource) throw new AppError("NOT_FOUND", 404);

    const urls = [resource.fileUrl, resource.thumbnailUrl].filter((u): u is string => Boolean(u));
    const results = await Promise.allSettled(urls.map((url) => uploadService.deleteByUrl(url)));
    results.forEach((r, i) => {
      if (r.status === "rejected") logger.error({ err: r.reason, url: urls[i], resourceId: id }, "Orphan R2 file");
    });
  },
};
