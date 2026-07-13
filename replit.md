# Nutterx Technologies — VCF Registration

A registration gateway where visitors submit their phone number and instantly download Nutterx Technologies' official contact card (VCF), with an admin dashboard to manage registrations and the card's contents.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/vcf-registration run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `MONGODB_URI`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET` (see `artifacts/vcf-registration/README.md`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, TanStack Query — `artifacts/vcf-registration`
- API: Express 5 — `artifacts/api-server`
- DB: MongoDB Atlas + Mongoose (this app deliberately does NOT use the workspace's default `@workspace/db` Postgres/Drizzle package — see Architecture decisions)
- Validation: Zod, generated from the OpenAPI spec
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for the API contract (register, admin auth, registrations CRUD, CSV export, VCF download, settings)
- `artifacts/api-server/src/models/` — Mongoose models (`Registration`, `VcfSettings` singleton)
- `artifacts/api-server/src/routes/` — `register.ts` (public registration + VCF download), `admin.ts` (session auth, registrations, stats, settings)
- `artifacts/api-server/src/lib/mongoose.ts` — MongoDB connection singleton
- `artifacts/vcf-registration/src/pages/` — `landing.tsx` (public form), `admin-login.tsx`, `admin-dashboard.tsx`

## Architecture decisions

- Uses MongoDB Atlas via Mongoose instead of the template's default Postgres/Drizzle `@workspace/db`, per explicit product requirement — the user supplies their own `MONGODB_URI`. `lib/db` is unused by this app.
- Admin auth is custom session-based (`express-session`, cookie name `nutterx.sid`) comparing against `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars, not Clerk or Replit Auth — matches the original spec.
- VCF settings are stored as a single singleton Mongo document (fixed `_id: "singleton-settings"`, `_id` typed as `String` since Mongoose's default is `ObjectId`).
- CSV export and VCF download are plain authenticated/public GET endpoints hit via direct fetch-to-blob on the frontend, not parsed through the generated JSON hooks.
- Logo upload is a base64 data URI (`logoDataUrl`) submitted via JSON PUT, not multipart upload — simpler for Orval codegen and small enough for a single logo image.

## Product

- Public landing page + registration form (name + E.164 phone number); duplicate phones are rejected.
- Success screen with one-click `NUTTERX.vcf` download built from live admin settings.
- Admin dashboard: stats (total/today/week), searchable+paginated registrations table with delete, CSV export, and a VCF settings editor (company info + logo).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Mongoose's default `required: true` on a `String` field also rejects empty strings, not just null/undefined — the `VcfSettings` defaults use `default: ""` without `required` to allow blank optional fields.
- After changing `lib/api-spec/openapi.yaml`, rerun codegen and check `useX(...)` calls that pass `{ query: { enabled } }` — TanStack Query types require `queryKey` alongside any other query option override; use the generated `getXQueryKey()` helper.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
