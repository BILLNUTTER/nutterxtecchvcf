// Vercel serverless entry point.
//
// On Replit this app runs as two separate services (see the "web" and
// "API Server" workflows). On Vercel there's no long-running server, so this
// file adapts the same Express app into a single serverless function that
// handles every request under /api/*.
//
// Vercel's zero-config "Other" builder only detects Serverless Functions
// inside a top-level `api/` directory (relative to the project root), so
// this file must live at the repo root rather than nested inside the
// vcf-registration artifact.
//
// Importantly, this imports the *pre-bundled* dist/serverless.mjs (built by
// `artifacts/api-server/build.mjs`) rather than the TypeScript source. That
// package's source uses extension-less relative imports, which are only
// valid under "moduleResolution": "bundler" (our repo-wide setting) — but
// Vercel's Node.js function builder enforces strict Node16/NodeNext ESM
// resolution for TypeScript functions, which rejects them. Importing the
// already-bundled plain-JS output sidesteps that entirely.
//
// `vercel.json` rewrites `/api/:path*` to this function, and mongoose's
// connection is cached across warm invocations (see connectMongo).
import type { IncomingMessage, ServerResponse } from "http";
import { app, connectMongo } from "../artifacts/api-server/dist/serverless.mjs";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  await connectMongo();
  app(req, res);
}
