import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/db";
import { logger } from "./utils/logger";
import { app } from "./app";

async function main() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}/api/v1`);
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Force exit if open connections keep the server alive.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Log and exit; the process manager restarts the server (backend.md §3.2).
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled rejection");
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

main().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
