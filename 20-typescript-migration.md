# TypeScript migration

The requested migration replaces JavaScript/JSX application source, tests, and Vite
configuration with TypeScript/TSX. Older numbered specs still describe the product;
this document supersedes their JavaScript paths and development commands.

## Organization

- React components use `.tsx`; other application modules and tests use `.ts`.
- `shared/contracts.d.ts` defines profiles, desktop items, messages, media, and the
  shared companion's state, actions, memories, and API responses. It has no runtime code.
- Zustand stores have explicit state/action interfaces. React primitives derive
  their props from their native or Radix components. Companion logic shares domain types.
- Backend ESM relative imports retain `.js` extensions: TypeScript resolves their
  `.ts` sources and emitted JavaScript works directly in Node.
- Vite bundles the client; TypeScript compiles backend source to `server/dist/`.
  Generated builds and credentials remain ignored by Git.

## Verification and development

Install each package as described in `RUN.md`, then run from the repository root:

```text
npm run typecheck
npm test
npm run build
```

`npm start` at the root remains the local development runner. Backend production
startup is `npm start --prefix server` after building. Tests use Node's built-in
runner plus `tsx`; no live Gemini requests are required.

## Incremental typing policy

This is a compiling migration, not a claim of complete strict-mode coverage.
Both packages currently use `strict: false` to accommodate existing unannotated
JavaScript-style handlers. Core shared types, store contracts, companion state,
React primitives, and upload results have explicit types. Existing runtime
validation is retained; TypeScript never validates untrusted HTTP data by itself.

There are no `@ts-nocheck` or compiler `noCheck` bypasses. Follow-up work can enable
`noImplicitAny` and `strictNullChecks` by subsystem before enabling full strict mode.

Two unreferenced legacy preview/folder components and dead legacy window functions
were removed; the active WindowManager and FolderDesktop remain. Type checking also
caught the soft-deleted text count using `deletedCount` instead of `modifiedCount`.

## Deployment

Builds require dev dependencies (TypeScript). Both frontend and backend builds must
include the repository's `shared/` directory. Railway should use the repository root
and `/railway.json`; Vercel should allow files outside its `client` root. See
`DEPLOYMENT.md` before publishing. No deployment is performed by this migration.

## Gemini configuration

Create or replace keys in [Google AI Studio](https://aistudio.google.com/app/apikey).
Set `GEMINI_API_KEY` only in Railway backend variables or uncommitted `server/.env`.
Never use a frontend `VITE_` variable. If a key was shared in chat, rotate it and do
not paste its replacement into chat. See Google's
[key-security guidance](https://ai.google.dev/gemini-api/docs/api-key).
