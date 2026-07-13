// Vercel serverless entry point.
//
// On Replit this app runs as two separate services (see the "web" and
// "API Server" workflows). On Vercel there's no long-running server, so this
// file adapts the same Express app (from @workspace/api-server) into a
// single serverless function that handles every request under /api/*.
//
// `vercel.json` rewrites `/api/:path*` to this function, and mongoose's
// connection is cached across warm invocations (see connectMongo).
/// <reference path="../../api-server/src/types/session.d.ts" />
import type { IncomingMessage, ServerResponse } from "http";
import app from "@workspace/api-server/src/app";
import { connectMongo } from "@workspace/api-server/src/lib/mongoose";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  await connectMongo();
  app(req, res);
}
