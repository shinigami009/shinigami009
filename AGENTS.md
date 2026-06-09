# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

Space Debris Collision Risk Tracker — a React + Three.js mission-control dashboard with a FastAPI backend. The frontend currently uses in-memory demo data and does not call the API; PostgreSQL is configured but unused.

### Services

| Service | Port | Command | Required for |
|---------|------|---------|--------------|
| Vite (frontend) | 5173 | `npm run dev` | UI development and E2E |
| FastAPI (backend) | 8000 | `cd backend && .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0` | API development |
| PostgreSQL | 5432 | `docker compose up -d postgres` | Optional (not used by current code) |

### Standard commands

See `README.md` for full setup. Quick reference:

- **Lint:** `npm run lint`
- **Frontend dev:** `npm run dev` (binds `0.0.0.0:5173`)
- **Backend dev:** `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload`
- **API health check:** `curl http://localhost:8000/api/health`

### Notes for cloud agents

- **Python venv:** The VM image must have `python3.12-venv` installed to create `backend/.venv`. If `python3 -m venv` fails, install it once with `sudo apt-get install -y python3.12-venv` (not part of the update script).
- **No automated tests:** The repo has ESLint only; there is no pytest, Vitest, or E2E test suite.
- **Vite proxy:** `/api` requests from the frontend dev server proxy to `http://127.0.0.1:8000` (see `vite.config.js`).
- **Plotly / Three.js:** The 3D globe loads Earth textures from `threejs.org` CDN; charts use `react-plotly.js`. Network access may be needed for textures on first load.
