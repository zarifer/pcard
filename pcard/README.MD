# Repository Guidelines

## Project Structure & Module Organization

- `src/` — application code: `App.tsx`, `index.tsx`, feature `pages/`, UI `components/`, `contexts/`, `utils/`, and `interfaces/`.
- `public/` — static assets (favicons, images). Refer with `/asset.png`.
- `index.html` — Vite entry. `vite.config.ts` — build config.
- `db.json` — local mock API data for `json-server` on `http://localhost:3001`.
- Tooling: `.eslintrc.cjs`, `tsconfig*.json`, `.nvmrc`, `.npmrc`, `Dockerfile`.

## Build, Test, and Development Commands

- `npm run dev` — starts Refine dev server with Vite.
- Mock API: `npx json-server --watch db.json --port 3001` (run in parallel).
- `npm run build` — type-checks (`tsc`) and builds production bundle via Refine.
- `npm run start` — serves the built app.
- Lint/format (on-demand): `npx eslint "src/**/*.{ts,tsx}"` and `npx prettier --write .`.
- Docker (optional): `docker build -t pcard .` then `docker run -p 3000:3000 pcard`.

## Coding Style & Naming Conventions

- TypeScript strict mode; prefer explicit types at boundaries.
- Use 2-space indentation; single quotes or Prettier defaults.
- Components: PascalCase files and exports (e.g., `CompanyList.tsx`).
- Variables/functions: camelCase; constants UPPER_SNAKE_CASE.
- Keep modules focused; colocate page-specific components under `src/pages/<feature>/`.
- Linting: ESLint (`@typescript-eslint`, react-hooks); formatting: Prettier.

## Testing Guidelines

- No test runner is configured yet. If adding tests, prefer Vitest + React Testing Library.
- Place tests next to source files as `*.test.ts(x)`; keep them deterministic and focused on behavior.
- Aim for meaningful coverage on routing, auth flows, and critical pages.

## Commit & Pull Request Guidelines

- Commits: follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`). Keep changes atomic.
- PRs: include a clear description, linked issues, reproduction/verification steps, and screenshots for UI changes.
- Keep PRs small and focused; update docs when changing commands or structure.

## Security & Configuration Tips

- Do not commit secrets. For configuration, prefer Vite envs (`.env.local`) with `VITE_` prefix.
- The API base is `http://localhost:3001` in `src/App.tsx`; if changing, consider promoting to `VITE_API_URL`.
- Validate all external data; avoid introducing direct DOM manipulation.

## Learn More

- **REST Data Provider** [Docs](https://refine.dev/docs/core/providers/data-provider/#overview)
- **Ant Design** [Docs](https://refine.dev/docs/ui-frameworks/antd/tutorial/)
- **React Router** [Docs](https://refine.dev/docs/core/providers/router-provider/)
- **Google Auth Provider** [Docs](https://refine.dev/docs/core/providers/auth-provider/)
