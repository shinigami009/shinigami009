from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class RiskCategory(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"


class TrackedObject(BaseModel):
    name: str
    norad_id: str = Field(..., examples=["25544"])
    object_type: Literal["satellite", "debris"]
    operator: str
    altitude_km: float
    speed_kmh: float
    inclination_deg: float
    risk: RiskCategory
    closest_approach_km: float
    collision_probability: float
    latitude_deg: float
    longitude_deg: float


class RiskAssessment(BaseModel):
    primary_norad_id: str
    secondary_norad_id: str
    closest_approach_km: float
    time_to_conjunction_minutes: int
    collision_probability: float
    risk: RiskCategory
    maneuver_recommendation: str


class PredictionWindow(BaseModel):
    label: str
    horizon_hours: float
    predicted_events: int
    peak_probability: float
    risk_corridor: str
    conjunction_norad_ids: list[str]


class Alert(BaseModel):
    title: str
    message: str
    eta: str
    risk: RiskCategory


class DebrisAnalytics(BaseModel):
    total_debris_count: int
    debris_by_altitude: dict[str, int]
    historical_collision_statistics: dict[str, int]
    high_risk_debris_objects: list[TrackedObject]
    density_heatmap: list[list[float]]


class TlePropagationRequest(BaseModel):
    name: str = "Custom object"
    tle_line_1: str
    tle_line_2: str
    minutes_ahead: list[int] = Field(default_factory=lambda: [60, 360, 1440])


class PropagatedPosition(BaseModel):
    minutes_ahead: int
    position_km: tuple[float, float, float]
    velocity_km_s: tuple[float, float, float]
