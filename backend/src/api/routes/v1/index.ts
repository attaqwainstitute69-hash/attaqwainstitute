import { Router } from "express";
import { authRouter } from "./auth.routes";
import { batchRouter } from "./batch.routes";
import { counsellingRouter } from "./counselling.routes";
import { courseRouter } from "./course.routes";
import { enrollmentRouter } from "./enrollment.routes";
import { institutionRouter } from "./institution.routes";
import { resourceRouter } from "./resource.routes";
import { reviewRouter } from "./review.routes";
import { uploadRouter } from "./upload.routes";
import { userRouter } from "./user.routes";
import { waitlistRouter } from "./waitlist.routes";

// v1Router — every v1 route file is mounted here (backend.md §1).
export const v1Router = Router();

v1Router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

v1Router.use(authRouter);
v1Router.use(userRouter);
v1Router.use(courseRouter);
v1Router.use(batchRouter);
v1Router.use(enrollmentRouter);
v1Router.use(waitlistRouter);
v1Router.use(institutionRouter);
v1Router.use(counsellingRouter);
v1Router.use(reviewRouter);
v1Router.use(resourceRouter);
v1Router.use(uploadRouter);
