# Repository Guidelines

## Project Structure & Module Organization

This is currently a specification-first repository. `README.md` summarizes the product and stack; numbered files `01-project-setup.md` through `14-deployment.md` define the implementation sequence. Read all relevant specifications before changing code, and treat them as the source of truth. `15-codex-master-prompt.md` consolidates the architectural constraints.

The intended application layout is:

- `client/src/`: React/Vite UI, organized into `components/`, `features/`, `hooks/`, `pages/`, `services/`, `store/`, and `lib/`.
- `server/src/`: Express code in `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, `services/`, and `utils/`.
- Tests should live beside the code they cover or in a clearly named `tests/` directory within each package.

## Build, Test, and Development Commands

Run commands from the relevant package after `client/` and `server/` are scaffolded:

- `npm install` installs that package's dependencies.
- `npm run dev` starts Vite in `client/` or the nodemon-backed API in `server/`.
- `npm run build` creates the production frontend bundle.
- `npm test` runs the package test suite once a test script is defined.
- `npm run lint` checks style when the lint script is added.

The API should default to port 5000. Verify setup with `GET http://localhost:5000/api/health` and expect `{ "ok": true }`.

## Coding Style & Naming Conventions

Use two-space indentation for JavaScript, JSX, JSON, and CSS. Keep React components small and name component files in PascalCase (`DesktopItem.jsx`); use camelCase for functions, hooks, and variables (`useDesktopStore`), and lowercase plural route names (`/api/items`). Keep controllers thin, validate all backend input, and persist drag positions only on drag end. Do not introduce Next.js, Redux, realtime features, or MongoDB binary storage.

## Testing Guidelines

No test framework is mandated yet; document the chosen runner in each package. Name tests `*.test.js` or `*.test.jsx`. Cover authentication success/failure, protected routes, invalid IDs, circular folder moves, item rendering and selection, folder opening, media previews, and video-control/drag separation. Run the manual checklist in `13-testing.md` for interaction changes.

## Commit & Pull Request Guidelines

Git history is not included, so no existing convention can be inferred. Use concise, imperative Conventional Commit messages, for example `feat: persist desktop item positions`. Pull requests should summarize the change, identify affected specification files, link issues, list test/build commands run, and include screenshots or recordings for UI behavior.

## Security & Configuration

Never commit `.env` files or credentials. Keep JWT, MongoDB Atlas, and Cloudinary secrets server-side. Restrict CORS, validate upload size/type, rate-limit auth and link-preview endpoints, and block private-network URLs during metadata fetching.
