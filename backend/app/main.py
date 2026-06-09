from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .database import get_settings
from .schemas import (
    Alert,
    DebrisAnalytics,
    PredictionWindow,
    PropagatedPosition,
    RiskAssessment,
    TlePropagationRequest,
    TrackedObject,
)
from .services import (
    fetch_celestrak_group,
    fetch_space_track_decay_candidates,
    get_alerts,
    get_debris_analytics,
    get_object,
    get_prediction_windows,
    get_risk_assessments,
    list_objects,
    propagate_tle,
)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "Mission-control API for satellite/debris tracking, conjunction screening, "
        "SGP4 propagation, CelesTrak ingestion, and Space-Track integration."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, object]:
    return {
        "service": settings.app_name,
        "status": "running",
        "docs": "/docs",
        "health": "/api/health",
        "endpoints": [
            "/api/assets",
            "/api/risks",
            "/api/predictions",
            "/api/alerts",
            "/api/analytics/debris",
        ],
    }


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@app.get("/api/assets", response_model=list[TrackedObject])
def assets(
    query: str | None = Query(default=None, description="Satellite name or NORAD ID"),
) -> list[TrackedObject]:
    return list_objects(query)


@app.get("/api/assets/{norad_id}", response_model=TrackedObject)
def asset(norad_id: str) -> TrackedObject:
    tracked_object = get_object(norad_id)
    if not tracked_object:
        raise HTTPException(status_code=404, detail="Tracked object not found")
    return tracked_object


@app.get("/api/risks", response_model=list[RiskAssessment])
def risks() -> list[RiskAssessment]:
    return get_risk_assessments()


@app.get("/api/predictions", response_model=list[PredictionWindow])
def predictions(norad_id: str | None = None) -> list[PredictionWindow]:
    return get_prediction_windows(norad_id)


@app.get("/api/alerts", response_model=list[Alert])
def alerts() -> list[Alert]:
    return get_alerts()


@app.get("/api/analytics/debris", response_model=DebrisAnalytics)
def debris_analytics() -> DebrisAnalytics:
    return get_debris_analytics()


@app.get("/api/integrations/celestrak/{group}")
async def celestrak_group(group: str = "active") -> dict[str, str]:
    tle_text = await fetch_celestrak_group(group)
    return {"group": group, "tle": tle_text}


@app.get("/api/integrations/space-track/status")
async def space_track_status() -> dict:
    return await fetch_space_track_decay_candidates()


@app.post("/api/propagate", response_model=list[PropagatedPosition])
def propagate(request: TlePropagationRequest) -> list[PropagatedPosition]:
    try:
        return propagate_tle(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
