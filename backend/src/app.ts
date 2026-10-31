import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { v1Router } from "./api/routes/v1";
import { requestId } from "./api/middlewares/requestId";
import { generalLimiter } from "./api/middlewares/rateLimiter";
import { originGuard } from "./api/middlewares/originGuard";
import { notFoundHandler, unsupportedVersionHandler } from "./api/middlewares/notFoundHandler";
import { errorHandler } from "./api/middlewares/errorHandler";

const SPEC_VERSION = "1.0.0";

export const app = express();

app.set("trust proxy", env.TRUST_PROXY);
app.disable("x-powered-by");

app.use(requestId);
// Set before the body parser so even MALFORMED_JSON responses carry the header.
app.use("/api", (_req, res, next) => {
  res.setHeader("X-API-Version", SPEC_VERSION);
  next();
});
app.use(helmet());
app.use(cors({ origin: new URL(env.FRONTEND_URL).origin, credentials: true }));
app.use("/api", generalLimiter);
app.use("/api", originGuard);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use("/api/v1", v1Router);
app.use("/api", unsupportedVersionHandler);

// Order matters: 404 then the error handler, registered last (backend.md §3.2).
app.use(notFoundHandler);
app.use(errorHandler);
