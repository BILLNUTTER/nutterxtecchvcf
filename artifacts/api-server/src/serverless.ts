// Entry point for serverless environments (e.g. Vercel), where a listening
// HTTP server (see `index.ts`) doesn't apply. Exposes the same Express `app`
// plus the lazy Mongo connector so a thin adapter (see the repo-root
// `api/index.ts`) can wrap it as a request handler.
//
// This file is bundled by `build.mjs` into a single dependency-free .mjs
// file, the same way `index.ts` is. Consumers should import the *compiled*
// `dist/serverless.mjs`, not this source file directly — that keeps
// Vercel's function bundler from having to type-check/resolve this
// package's whole TypeScript source tree (which uses extension-less
// relative imports incompatible with the strict Node16/NodeNext module
// resolution Vercel enforces for ESM functions).
import app from "./app";
import { connectMongo } from "./lib/mongoose";

export { app, connectMongo };
export default app;
