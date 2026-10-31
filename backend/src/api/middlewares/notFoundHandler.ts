import type { RequestHandler } from "express";
import { AppError } from "../../utils/AppError";

export const SUPPORTED_VERSIONS = ["v1"] as const;

// /api/courses or /api/v9/... → 404 UNSUPPORTED_API_VERSION (api-spec §1.8.1).
export const unsupportedVersionHandler: RequestHandler = (req, _res, next) => {
  const version = req.path.split("/")[1];
  if (!SUPPORTED_VERSIONS.includes(version as (typeof SUPPORTED_VERSIONS)[number])) {
    throw new AppError("UNSUPPORTED_API_VERSION", 404, { supportedVersions: SUPPORTED_VERSIONS });
  }
  next();
};

export const notFoundHandler: RequestHandler = () => {
  throw new AppError("ROUTE_NOT_FOUND", 404);
};
