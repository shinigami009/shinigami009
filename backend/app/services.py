from __future__ import annotations

from datetime import UTC, datetime, timedelta
from math import exp

import httpx
from sgp4.api import Satrec, jday

from .database import get_settings
from .schemas import (
    Alert,
    DebrisAnalytics,
    PredictionWindow,
    PropagatedPosition,
    RiskAssessment,
    RiskCategory,
    TlePropagationRequest,
    TrackedObject,
)


TRACKED_OBJECTS: list[TrackedObject] = [
    TrackedObject(
        name="ISS (ZARYA)",
        norad_id="25544",
        object_type="satellite",
        operator="NASA / Roscosmos",
        altitude_km=419,
        speed_kmh=27600,
        inclination_deg=51.6,
        risk=RiskCategory.high,
        closest_approach_km=1.8,
        collision_probability=0.0062,
        latitude_deg=33.12,
        longitude_deg=-114.81,
    ),
    TrackedObject(
        name="Starlink-30142",
        norad_id="59123",
        object_type="satellite",
        operator="SpaceX",
        altitude_km=552,
        speed_kmh=27080,
        inclination_deg=53.2,
        risk=RiskCategory.medium,
        closest_approach_km=4.7,
        collision_probability=0.0017,
        latitude_deg=-18.75,
        longitude_deg=84.26,
    ),
    TrackedObject(
        name="Hubble Space Telescope",
        norad_id="20580",
        object_type="satellite",
        operator="NASA / ESA",
        altitude_km=535,
        speed_kmh=27300,
        inclination_deg=28.5,
        risk=RiskCategory.low,
        closest_approach_km=14.2,
        collision_probability=0.0002,
        latitude_deg=4.48,
        longitude_deg=-21.44,
    ),
    TrackedObject(
        name="NOAA-20",
        norad_id="43013",
        object_type="satellite",
        operator="NOAA",
        altitude_km=824,
        speed_kmh=26650,
        inclination_deg=98.7,
        risk=RiskCategory.medium,
        closest_approach_km=6.1,
        collision_probability=0.0012,
        latitude_deg=76.36,
        longitude_deg=36.82,
    ),
    TrackedObject(
        name="GPS BIIR-2",
        norad_id="24876",
        object_type="satellite",
        operator="US Space Force",
        altitude_km=20200,
        speed_kmh=14000,
        inclination_deg=55,
        risk=RiskCategory.low,
        closest_approach_km=38.4,
        collision_probability=0.00005,
        latitude_deg=51.02,
        longitude_deg=-72.09,
    ),
    TrackedObject(
        name="Fengyun-1C Debris",
        norad_id="30671",
        object_type="debris",
        operator="Fragment cloud",
        altitude_km=865,
        speed_kmh=26500,
        inclination_deg=98.8,
        risk=RiskCategory.critical,
        closest_approach_km=0.72,
        collision_probability=0.018,
        latitude_deg=-64.55,
        longitude_deg=129.18,
    ),
    TrackedObject(
        name="Cosmos 2251 Fragment",
        norad_id="33757",
        object_type="debris",
        operator="Iridium-Cosmos event",
        altitude_km=790,
        speed_kmh=26870,
        inclination_deg=74.0,
        risk=RiskCategory.high,
        closest_approach_km=1.2,
        collision_probability=0.0094,
        latitude_deg=48.75,
        longitude_deg=151.4,
    ),
    TrackedObject(
        name="CZ-2D Rocket Body",
        norad_id="48274",
        object_type="debris",
        operator="Rocket body",
        altitude_km=625,
        speed_kmh=27110,
        inclination_deg=97.6,
        risk=RiskCategory.medium,
        closest_approach_km=5.5,
        collision_probability=0.0021,
        latitude_deg=-22.1,
        longitude_deg=-4.66,
    ),
]


def calculate_collision_probability(
    closest_approach_km: float,
    covariance_km: float = 2.5,
    combined_radius_m: float = 18,
) -> float:
    """Compact risk approximation for UI screening before full covariance analysis."""
    cross_section_km2 = 3.14159 * (combined_radius_m / 1000) ** 2
    covariance_area_km2 = 3.14159 * covariance_km**2
    geometric_probability = cross_section_km2 / covariance_area_km2
    miss_distance_factor = exp(-((closest_approach_km / covariance_km) ** 2))
    return min(0.05, geometric_probability * miss_distance_factor * 420)


def categorize_risk(probability: float, closest_approach_km: float) -> RiskCategory:
    if probability >= 0.01 or closest_approach_km < 1:
        return RiskCategory.critical
    if probability >= 0.005 or closest_approach_km < 2:
        return RiskCategory.high
    if probability >= 0.001 or closest_approach_km < 8:
        return RiskCategory.medium
    return RiskCategory.low


def list_objects(query: str | None = None) -> list[TrackedObject]:
    if not query:
        return TRACKED_OBJECTS

    normalized = query.lower()
    return [
        asset
        for asset in TRACKED_OBJECTS
        if normalized in asset.name.lower() or normalized in asset.norad_id
    ]


def get_object(norad_id: str) -> TrackedObject | None:
    return next((asset for asset in TRACKED_OBJECTS if asset.norad_id == norad_id), None)


def get_risk_assessments() -> list[RiskAssessment]:
    pairings = [
        ("25544", "30671", 1.8, 43, "Prepare drag makeup maneuver option."),
        ("25544", "33757", 1.2, 118, "Increase tracking cadence to 30 seconds."),
        ("59123", "48274", 4.7, 330, "Monitor; no avoidance burn currently required."),
        ("43013", "30671", 6.1, 640, "Screen against updated TLE set on next ingest."),
    ]

    assessments: list[RiskAssessment] = []
    for primary, secondary, distance, minutes, recommendation in pairings:
        probability = calculate_collision_probability(distance)
        assessments.append(
            RiskAssessment(
                primary_norad_id=primary,
                secondary_norad_id=secondary,
                closest_approach_km=distance,
                time_to_conjunction_minutes=minutes,
                collision_probability=probability,
                risk=categorize_risk(probability, distance),
                maneuver_recommendation=recommendation,
            )
        )
    return assessments


def get_prediction_windows(norad_id: str | None = None) -> list[PredictionWindow]:
    focus = norad_id or "all"
    return [
        PredictionWindow(
            label="1 hour",
            horizon_hours=1,
            predicted_events=4,
            peak_probability=0.0062,
            risk_corridor="LEO 51.6 deg",
            conjunction_norad_ids=[focus, "30671"],
        ),
        PredictionWindow(
            label="6 hours",
            horizon_hours=6,
            predicted_events=9,
            peak_probability=0.0181,
            risk_corridor="LEO polar",
            conjunction_norad_ids=[focus, "33757", "48274"],
        ),
        PredictionWindow(
            label="24 hours",
            horizon_hours=24,
            predicted_events=17,
            peak_probability=0.0244,
            risk_corridor="SSO 865 km",
            conjunction_norad_ids=[focus, "30671", "33757"],
        ),
        PredictionWindow(
            label="7 days",
            horizon_hours=168,
            predicted_events=42,
            peak_probability=0.0492,
            risk_corridor="LEO + MEO",
            conjunction_norad_ids=[focus, "30671", "33757", "48274"],
        ),
    ]


def get_alerts() -> list[Alert]:
    return [
        Alert(
            title="ISS conjunction watch",
            message="Fengyun-1C fragment projected within 1.8 km corridor.",
            eta="T+43m",
            risk=RiskCategory.high,
        ),
        Alert(
            title="Critical debris density band",
            message="865 km sun-synchronous shell exceeds baseline density by 21%.",
            eta="Live",
            risk=RiskCategory.critical,
        ),
        Alert(
            title="Starlink plane 53.2 review",
            message="Three medium-risk passes within the next 24 hours.",
            eta="T+6h",
            risk=RiskCategory.medium,
        ),
    ]


def get_debris_analytics() -> DebrisAnalytics:
    return DebrisAnalytics(
        total_debris_count=34821,
        debris_by_altitude={
            "<500 km": 8100,
            "500-800 km": 12840,
            "800-1200 km": 9340,
            "MEO": 2870,
            "GEO": 1671,
        },
        historical_collision_statistics={
            "Iridium 33 / Cosmos 2251": 2009,
            "Fengyun-1C ASAT fragments": 2007,
            "DMSP-F13 breakup": 2015,
            "NOAA-16 fragmentation": 2015,
        },
        high_risk_debris_objects=[
            asset for asset in TRACKED_OBJECTS if asset.object_type == "debris"
        ],
        density_heatmap=[
            [0.2, 0.4, 0.7, 0.6],
            [0.3, 0.8, 1.0, 0.7],
            [0.1, 0.5, 0.9, 0.95],
            [0.08, 0.2, 0.45, 0.62],
        ],
    )


async def fetch_celestrak_group(group: str = "active") -> str:
    settings = get_settings()
    url = f"{settings.celestrak_base_url}/NORAD/elements/gp.php"
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(url, params={"GROUP": group, "FORMAT": "tle"})
        response.raise_for_status()
        return response.text


async def fetch_space_track_decay_candidates() -> dict:
    settings = get_settings()
    if not settings.space_track_identity or not settings.space_track_password:
        return {
            "configured": False,
            "message": "Set SPACE_DEBRIS_SPACE_TRACK_IDENTITY and PASSWORD to enable.",
        }

    return {
        "configured": True,
        "message": "Credentials available; authenticate with Space-Track session here.",
    }


def propagate_tle(request: TlePropagationRequest) -> list[PropagatedPosition]:
    satellite = Satrec.twoline2rv(request.tle_line_1, request.tle_line_2)
    now = datetime.now(UTC)
    positions: list[PropagatedPosition] = []

    for minutes in request.minutes_ahead:
        target = now + timedelta(minutes=minutes)
        jd, fraction = jday(
            target.year,
            target.month,
            target.day,
            target.hour,
            target.minute,
            target.second + target.microsecond / 1_000_000,
        )
        error, position, velocity = satellite.sgp4(jd, fraction)
        if error != 0:
            raise ValueError(f"SGP4 propagation failed with code {error}")
        positions.append(
            PropagatedPosition(
                minutes_ahead=minutes,
                position_km=tuple(round(value, 4) for value in position),
                velocity_km_s=tuple(round(value, 6) for value in velocity),
            )
        )

    return positions
