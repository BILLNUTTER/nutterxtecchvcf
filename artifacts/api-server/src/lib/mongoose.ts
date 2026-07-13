import mongoose from "mongoose";
import { logger } from "./logger";

if (!process.env.MONGODB_URI) {
  throw new Error(
    "MONGODB_URI must be set. Provide your MongoDB Atlas connection string in the environment.",
  );
}

mongoose.set("strictQuery", true);

let connectPromise: Promise<typeof mongoose> | null = null;

/**
 * Lazily connects to MongoDB Atlas and reuses a single connection across the
 * process lifetime. Call and await this before any model operation.
 */
export function connectMongo(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose);
  }

  if (!connectPromise) {
    connectPromise = mongoose
      .connect(process.env.MONGODB_URI as string)
      .then((conn) => {
        logger.info("Connected to MongoDB Atlas");
        return conn;
      })
      .catch((err) => {
        connectPromise = null;
        logger.error({ err }, "Failed to connect to MongoDB Atlas");
        throw err;
      });
  }

  return connectPromise;
}
