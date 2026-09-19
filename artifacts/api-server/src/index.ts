import app from "./app.js";
import { logger } from "./lib/logger.js";
import { closeDatabase } from "@workspace/db";

const rawPort = process.env["PORT"] || "4000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Graceful shutdown initiated");

  server.close(async () => {
    logger.info("HTTP server closed");
    try {
      await closeDatabase();
      logger.info("Database connections closed cleanly");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during database shutdown");
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if graceful close hangs
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
