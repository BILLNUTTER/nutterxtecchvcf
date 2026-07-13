---
name: Generated TanStack Query hooks and the `enabled` option
description: TypeScript error when passing only `{ enabled }` to a generated React Query hook's `query` option in this repo's Orval codegen setup.
---

Passing `{ query: { enabled: someBool } }` alone to a generated `useX()` hook fails typecheck with "Property 'queryKey' is missing" — the generated `UseQueryOptions` type in this codegen setup requires `queryKey` whenever any query option is overridden, it isn't auto-merged.

**Why:** Encountered across multiple query hooks (`useGetStats`, `useListRegistrations`, `useGetVcfSettings`) in a react-vite artifact after wiring up `enabled` guards for session-gated queries.

**How to apply:** When overriding `query` options (like `enabled`) on a generated hook, also pass the matching generated `getXQueryKey(...)` helper as `queryKey` in the same options object.
