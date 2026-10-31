import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

mongoose.set("strictQuery", true);

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB });
  logger.info({ db: env.MONGODB_DB }, "MongoDB connected");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected");
}
