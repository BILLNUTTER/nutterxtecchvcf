---
name: Deploying a pnpm-workspace Express+Vite app to Vercel
description: How to make a Replit artifact pair (separate Vite frontend + Express backend workflows) also deploy as one Vercel project.
---

When an app is built as two Replit artifacts (a Vite frontend service + an Express backend service in a pnpm workspace) but needs to also be Vercel-deployable as a single project:

- Give the frontend package a workspace dependency on the backend package and add `api/index.ts` inside the frontend directory that imports the backend's exported Express `app` (deep import like `@workspace/api-server/src/app` works via pnpm's symlinked workspace `node_modules`, since Node resolves bare specifiers relative to the *file's* location, not the importer's). Export a handler that calls `app(req, res)`.
- Add a `vercel.json` in the frontend directory with `rewrites` sending `/api/:path*` → `/api` (the function) and everything else → `/index.html` (SPA fallback), and set Vercel's Root Directory to that frontend folder.
- Vite configs that hard-require `PORT`/`BASE_PATH` env vars (common in Replit scaffolds) must fall back to defaults when not serving (check `npm_lifecycle_event` for `dev`/`serve`), or a plain `vercel build` / `vite build` fails outside Replit.
- Cross-package TypeScript checking breaks if the frontend's own `tsconfig.json` tries to include the backend's source (ambient `.d.ts` module augmentations like Express-session type extensions won't apply across separate tsc programs, causing spurious `Property does not exist` errors). Give the `api/` folder its own standalone `tsconfig.json` (extending the backend's) instead of adding it to the frontend's main tsconfig `include`.

**Why:** this lets one repository serve both Replit (two workflows/services) and Vercel (one project, one serverless function) without duplicating business logic.
