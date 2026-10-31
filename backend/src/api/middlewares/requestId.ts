import type { RequestHandler } from "express";
import { ulid } from "ulid";

const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

// Reuse a well-formed client X-Request-Id, otherwise generate `req_<ULID>` (api-spec §1.9.2).
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get("X-Request-Id");
  req.id = incoming && CLIENT_ID_PATTERN.test(incoming) ? incoming : `req_${ulid()}`;
  res.setHeader("X-Request-Id", req.id);
  next();
};
