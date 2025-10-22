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

## DB guide

cd /vb100/pcard/deploy

- Create tables
  sudo docker compose exec -T db psql -U vb100 -d vb100 -f - < magic.sql

- Check tables
  sudo docker compose exec -T db psql -U vb100 -d vb100 -c '\dt'

## Users guide

VM:
sudo docker compose exec -it api bash

- List all users: npm run users -- list
- Export users to JSON/CSV: npm run users -- export --format csv > users.csv
- Add a single user (upsert): npm run users -- add --email xy@virusbulletin.com --name "XY" --password "Uborka23"
- Reset password: npm run users -- reset --email xy@virusbulletin.com --password "NewTemp_456!"
- Deactivate user: npm run users -- deactivate --email someone@virusbulletin.com
- Reactivate user: npm run users -- reactivate --email someone@virusbulletin.com
- Batch add/upsert from file:
  Create pcard/server/users.batch.json:
  [
  { "email": "alice@virusbulletin.com", "name": "Alice", "password": "TmpA1!" },
  { "email": "bob@virusbulletin.com", "name": "Bob", "password": "TmpB2!" }
  ]
  Run:
  npm run users -- batch --file users.batch.json

  ## Send new to the VM

  Local:
  delete node modules from pcard/ and pcard/server/ (you can install them again later with npm install)
  scp -r pcard vblab@lab-microservices.vb.internal:~/vb100

  VM:
  sudo docker compose down
  sudo docker compose up -d --build

  or if you didn't touch all of them:
  - sudo docker compose --env-file .env build --no-cache api
  - sudo docker compose up -d --force-recreate --no-deps api

  sudo docker compose ps

## VM logs check

VM:

- sudo docker compose logs -f api (POSTGRESQL connection OK)
- sudo docker compose logs -f db (DB stuff)
- sudo docker compose logs -f edge (Web stuff)
