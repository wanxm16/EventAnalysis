# Repository Guidelines

## Project Structure & Modules
- `backend/` FastAPI backend: `main.py` (entry), `services.py`, `models.py`, `ai_chat_service.py`, `manage_vector_db.py`.
- `frontend/` React app: `src/` (pages, components, hooks), `public/`.
- `data/` CSV sources used by analytics and AI.
- `test/` Backend test scripts (Python). Frontend tests live in `frontend/src/test/`.
- Scripts: `start.sh`, `stop.sh`, `system-status.sh`, `logs.sh`.

## Build, Test, and Dev Commands
- Start full stack: `./start.sh` (installs deps, runs backend on 8000, frontend on 3000).
- Backend only: `./start.sh --backend-only` or `python backend/main.py` (after `pip install -r backend/requirements.txt`).
- Frontend only: `./start.sh --frontend-only` or `cd frontend && pnpm start` (or `npm start`).
- Stop services: `./stop.sh`. Status: `./start.sh --status`. Tail logs: `./logs.sh`.
- Frontend tests: `cd frontend && pnpm test` (CRA/Jest runner).
- Backend test scripts: `python test/test_ai_chat.py`, `python test/test_all_queries.py`.

## Coding Style & Naming
- Python: PEP 8, 4‑space indent, snake_case for functions/variables, PascalCase for classes. Prefer type hints in new code.
- JavaScript/React: Prettier/Eslint via `react-scripts` defaults. camelCase for functions/vars, PascalCase for components, files like `ComponentName.jsx`.
- Keep modules small; backend business logic in `services.py`, API wiring in `main.py`.

## Testing Guidelines
- Frontend: place Jest tests under `frontend/src/**/__tests__` or `frontend/src/**/*.test.js`. Mock API calls in `src/services/api.js`.
- Backend: current tests are executable scripts under `test/`. If adding pytest, mirror files as `test_*.py` and avoid network/AI calls; use `data/` CSV fixtures.
- Aim for coverage on critical flows: filtering, clustering, and AI query routing.

## Commit & Pull Request Guidelines
- Use Conventional Commits, e.g. `feat(filter): 优化日期筛选` or `fix(api): handle empty town`.
- PRs: focused scope, clear description, linked issue, steps to verify, and screenshots/GIFs for UI changes. Update `README.md`/`USAGE.md` if behavior changes.

## Security & Configuration
- Do not commit secrets. Start by copying `config.env.example` → `config.env` and `ai_config.env.example` → `ai_config.env`.
- Key vars: `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`. `start.sh` auto-loads both env files.
