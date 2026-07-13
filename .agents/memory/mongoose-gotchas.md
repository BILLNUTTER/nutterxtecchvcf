---
name: Mongoose schema gotchas
description: Non-obvious Mongoose behaviors that caused runtime errors during a MongoDB Atlas + Mongoose backend build.
---

- A `String` field with `required: true` rejects an empty string `""`, not just `null`/`undefined` — unlike most other Mongoose types. If a field should allow blanks (e.g. an optional settings field), give it a `default: ""` and omit `required`, or validate explicitly.
  **Why:** Discovered when a singleton settings document with `required: true` string fields and empty-string defaults failed `ValidationError` on first creation.
  **How to apply:** For any Mongoose schema field that legitimately allows an empty string, don't combine `required: true` with `default: ""`.

- A singleton-style document addressed by a fixed string id (e.g. `_id: "singleton-settings"`) needs the schema to declare `_id: { type: String }` explicitly — Mongoose defaults `_id` to `ObjectId`, and passing a non-ObjectId string throws a `CastError`.
  **Why:** Hit a `CastError: Cast to ObjectId failed` when creating a fixed-id settings singleton without overriding the `_id` type.
  **How to apply:** Any "single document per collection" pattern with a hardcoded id must override `_id`'s type in the schema.
