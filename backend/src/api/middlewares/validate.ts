import type { RequestHandler } from "express";
import type { ZodType } from "zod";

interface RequestSchemas {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
}

// Parses params/query/body with Zod and stores the result on req.valid.
// A ZodError is thrown as-is; errorHandler maps it to 400 VALIDATION_ERROR with every failing field.
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    req.valid = {
      params: (schemas.params?.parse(req.params) ?? req.params) as Record<string, unknown>,
      query: (schemas.query?.parse(req.query) ?? req.query) as Record<string, unknown>,
      body: schemas.body ? schemas.body.parse(req.body) : req.body,
    };
    next();
  };
}
