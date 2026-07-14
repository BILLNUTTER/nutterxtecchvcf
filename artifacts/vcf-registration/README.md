# Nutterx Technologies — VCF Registration

A production-ready registration gateway for Nutterx Technologies. Visitors register their phone number and instantly download the company's official contact card (`NUTTERX.vcf`). An admin dashboard lets staff manage registrations and the contact card contents.

## Stack

- **Frontend**: React + Vite + TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, wouter — `artifacts/vcf-registration`
- **Backend**: Express 5, Mongoose (MongoDB Atlas), express-session, Helmet, express-rate-limit — `artifacts/api-server`
- **API contract**: OpenAPI spec (`lib/api-spec/openapi.yaml`) code-generated into typed React Query hooks (`@workspace/api-client-react`) and Zod validators (`@workspace/api-zod`)

## How it works

### Public flow (`/`)
1. The page shows live **Community Progress** (registrations so far vs. the admin-configured target, 500 by default).
2. Visitor enters full name + phone number (country code, no spaces or `+` sign, e.g. `254712345678`).
3. Backend normalizes the number to strict E.164 internally and rejects duplicates with "This phone number is already registered."
4. The `NUTTERX.vcf` download stays locked until the community hits the target — once it does, the download CTA unlocks for every visitor.

### Admin access (hidden)
There is no visible admin link anywhere in the UI. Reach the admin login by visiting the site's root URL with `?admin=true` appended (e.g. `https://your-app-domain/?admin=true`), or by navigating directly to `/admin/login`.
- Session-based login using the `ADMIN_USERNAME` / `ADMIN_PASSWORD` environment variables (rate-limited).
- Dashboard shows total / today / this-week registration counts plus VCF-unlock progress, a searchable + paginated registrations table with delete, a CSV export, and a settings form to edit the VCF card (company name, contact name, phone, email, website, address, WhatsApp, logo, and the **VCF Unlock Target**).

## Environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), add a database user, allow network access from anywhere (or this environment's IP), and copy the connection string (`mongodb+srv://...`). |
| `ADMIN_USERNAME` | Admin login username. |
| `ADMIN_PASSWORD` | Admin login password. |
| `SESSION_SECRET` | Random secret used to sign admin session cookies. |
| `PORT` | Set automatically by the platform; do not hardcode. |

All four secrets are managed through Replit's Secrets — never commit them to source control.

## Running locally (in this workspace)

Two workflows back this app and start automatically:
- **API Server** (`artifacts/api-server`) — Express backend on its own internal port, mounted at `/api`.
- **web** (`artifacts/vcf-registration`) — the Vite frontend, served at the app's root path.

To restart either manually:
```
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/vcf-registration run dev
```

To regenerate API types/hooks after changing `lib/api-spec/openapi.yaml`:
```
pnpm --filter @workspace/api-spec run codegen
```

## Managing the VCF card

Sign in at `/admin/login`, open the **Settings** tab, edit any field, optionally upload a new logo image, and save. The next `NUTTERX.vcf` download (public or from the dashboard) reflects the new values immediately — there's a single shared settings document, no redeploy needed.

## Managing registrations

From the admin dashboard's **Registrations** tab:
- Search by name or phone (debounced, server-side).
- Delete a registration (immediate, cannot be undone).
- Export all registrations as a CSV file (name, phone, registration timestamp).

## Deploying

### On Replit
Use Replit's **Publish** action once you're happy with the app in preview — it builds and serves both the API and frontend workflows in production.

### On Vercel
This app is also configured to deploy as a single Vercel project (frontend + API in one deployment), directly from the monorepo root — **do not** override the Root Directory in Vercel's project settings; leave it at the repo root.

1. Push this repository to GitHub and import it into Vercel.
2. Leave the Vercel **Root Directory** setting at its default (repo root). The repo-root `vercel.json` handles routing everything to the right place.
3. Add these environment variables in the Vercel dashboard (Project → Settings → Environment Variables): `MONGODB_URI`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
4. Deploy. Vercel runs the monorepo's default build (`pnpm run build`, which builds every workspace package), and the repo-root `vercel.json`:
   - Points `outputDirectory` at `artifacts/vcf-registration/dist/public` (the Vite build output).
   - Deploys the repo-root `api/index.ts` as a serverless function that wraps the same Express app used on Replit, so registration, admin, and VCF download endpoints all work identically at `/api/*`. (Vercel's zero-config builder only detects functions in a top-level `api/` directory, so this file lives at the repo root rather than inside the artifact folder, importing `@workspace/api-server` as a root-level workspace dependency.)
   - Rewrites everything except `/api/*` to `index.html`, so client-side routing (including the `?admin=true` admin entry point) works on refresh/direct links.

No code changes are needed between the two targets — the same Express app and React frontend run on both.

## Security notes

- Helmet sets standard security headers; CORS is scoped to same-origin credentialed requests.
- Registration and admin login endpoints are rate-limited to slow down abuse.
- Phone numbers are validated server-side against strict E.164 format and enforced unique via a MongoDB unique index (handles race conditions on concurrent submissions).
- Admin routes require an authenticated session; sessions are HTTP-only cookies signed with `SESSION_SECRET`.
