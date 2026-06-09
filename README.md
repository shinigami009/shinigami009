# Space Debris Collision Risk Tracker

An enterprise-grade mission-control web application for monitoring satellites,
orbital debris, conjunction risks, and future orbital predictions. The product
uses a full-screen interactive 3D Earth experience inspired by
SatelliteTracker3D, then expands it into a professional aerospace operations
dashboard for space situational awareness teams.

## Product capabilities

- Full-screen React + Three.js Earth with realistic texture, atmosphere glow,
  stars, smooth rotation, orbit controls, orbital tracks, animated satellites,
  and debris fields.
- Collision risk monitoring for satellites and debris with closest approach
  distances, probability scores, and Low/Medium/High/Critical categories.
- Mission-control layout with glassmorphism panels, neon cyan/blue accents,
  telemetry readouts, alert feeds, and prediction controls.
- Debris analytics dashboard with altitude bands, density heatmap, historical
  collision statistics, and high-risk debris objects.
- Satellite search by name or NORAD ID plus quick access for ISS, Starlink,
  Hubble, NOAA, and GPS satellites.
- FastAPI backend with endpoints for assets, risks, alerts, predictions,
  debris analytics, live CelesTrak TLE fetches, Space-Track credential status,
  and SGP4 propagation.
- PostgreSQL configuration for durable catalog, telemetry, and risk-event
  persistence.

## Technology stack

- Frontend: React, Vite, Three.js, React Three Fiber, Drei, Plotly, Lucide icons
- Backend: Python FastAPI, Pydantic, SQLAlchemy
- Database: PostgreSQL
- Orbital calculations: SGP4
- Data source integrations: CelesTrak and Space-Track integration points

## Run the frontend

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually
`http://localhost:5173`.

## Run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`, with OpenAPI docs at
`http://localhost:8000/docs`. Opening `http://localhost:8000/` returns a small
service-status response with links to the main API routes.

## Run PostgreSQL

```bash
docker compose up -d postgres
```

The default local connection string is:

```text
postgresql+psycopg2://mission_control:mission_control@localhost:5432/space_debris
```

## Key API endpoints

- `GET /api/health`
- `GET /api/assets?query=iss`
- `GET /api/assets/{norad_id}`
- `GET /api/risks`
- `GET /api/predictions?norad_id=25544`
- `GET /api/alerts`
- `GET /api/analytics/debris`
- `GET /api/integrations/celestrak/{group}`
- `GET /api/integrations/space-track/status`
- `POST /api/propagate`

## Data-source notes

CelesTrak public TLE retrieval is available through the backend integration
endpoint. Space-Track requires account credentials; set these in `backend/.env`:

```text
SPACE_DEBRIS_SPACE_TRACK_IDENTITY=your@email.com
SPACE_DEBRIS_SPACE_TRACK_PASSWORD=your-password
```

The current app ships with deterministic demonstration data so the dashboard is
usable offline. Production deployments should schedule catalog ingestion,
persist normalized TLE/object metadata in PostgreSQL, and run high-cadence SGP4
conjunction screening jobs against the persisted catalog.
