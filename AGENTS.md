# Repository Guidelines

## Project Structure & Module Organization

This is currently a specification-first repository. `README.md` summarizes the product and stack; numbered files `01-project-setup.md` through `14-deployment.md` define the implementation sequence. Read all relevant specifications before changing code, and treat them as the source of truth. `15-codex-master-prompt.md` consolidates the architectural constraints.

The application is implemented in TypeScript. `20-typescript-migration.md` supersedes older JavaScript/JSX file and tooling examples. The application layout is:

- `client/src/`: React/Vite UI, organized into `components/`, `features/`, `hooks/`, `pages/`, `services/`, `store/`, and `lib/`.
- `server/src/`: Express code in `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, `services/`, and `utils/`.
- `shared/contracts.d.ts`: type-only contracts shared by frontend and backend.
- Tests should live beside the code they cover or in a clearly named `tests/` directory within each package.

## Build, Test, and Development Commands

Run commands from the relevant package after `client/` and `server/` are scaffolded:

- `npm install` installs that package's dependencies.
- `npm run dev` starts Vite in `client/` or the `tsx watch` API in `server/`.
- `npm run typecheck` checks TypeScript; at the root it checks both packages.
- `npm run build` builds the current package; at the root it builds the backend and frontend.
- `npm test` runs Node's test runner with `tsx`; at the root it runs both suites.
- `npm run lint` checks style when the lint script is added.

The API should default to port 5000. Verify setup with `GET http://localhost:5000/api/health` and expect `{ "ok": true }`.

## Coding Style & Naming Conventions

Use two-space indentation for TypeScript, TSX, JSON, and CSS. Keep React components small and name component files in PascalCase (`DesktopItem.tsx`); use camelCase for functions, hooks, and variables (`useDesktopStore`), and lowercase plural route names (`/api/items`). Keep controllers thin, validate all backend input, and persist drag positions only on drag end. Do not introduce Next.js, Redux, realtime features, or MongoDB binary storage.

## Testing Guidelines

Use Node's built-in test runner with the `tsx` loader. Name tests `*.test.ts` or `*.test.tsx`. Cover authentication success/failure, protected routes, invalid IDs, circular folder moves, item rendering and selection, folder opening, media previews, and video-control/drag separation. Run the manual checklist in `13-testing.md` for interaction changes.

## Commit & Pull Request Guidelines

Git history is not included, so no existing convention can be inferred. Use concise, imperative Conventional Commit messages, for example `feat: persist desktop item positions`. Pull requests should summarize the change, identify affected specification files, link issues, list test/build commands run, and include screenshots or recordings for UI behavior.

## Security & Configuration

Never commit `.env` files or credentials. Keep JWT, MongoDB Atlas, and Cloudinary secrets server-side. Restrict CORS, validate upload size/type, rate-limit auth and link-preview endpoints, and block private-network URLs during metadata fetching.
