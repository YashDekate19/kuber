import logging
import requests
from flask import Blueprint, request, jsonify
from app.utils.geo import haversine_distance, estimate_duration_minutes

logger = logging.getLogger(__name__)
location_bp = Blueprint("location", __name__, url_prefix="/api/location")

# Popular landmarks for instant 0-latency autocomplete in demo cities
POPULAR_LANDMARKS = [
    {"name": "Kempegowda International Airport (BLR)", "lat": 13.1986, "lng": 77.7066, "type": "Airport"},
    {"name": "MG Road Metro Station", "lat": 12.9756, "lng": 77.6066, "type": "Metro Station"},
    {"name": "Koramangala Sony World Signal", "lat": 12.9345, "lng": 77.6265, "type": "Hub"},
    {"name": "Indiranagar 100ft Road", "lat": 12.9719, "lng": 77.6412, "type": "Commercial"},
    {"name": "Whitefield ITPL", "lat": 12.9854, "lng": 77.7317, "type": "Tech Park"},
    {"name": "Electronic City Phase 1", "lat": 12.8452, "lng": 77.6602, "type": "Tech Park"},
    {"name": "Majestic Bus Station / KSR Railway", "lat": 12.9774, "lng": 77.5708, "type": "Transit"}
]

@location_bp.route("/search", methods=["GET"])
def search_places():
    """
    Address autocomplete & geocoding proxy.
    Returns matched landmarks first, and queries OpenStreetMap Nominatim for free global search.
    """
    query = request.args.get("q", "").strip()
    if not query or len(query) < 2:
        return jsonify({"status": "success", "data": POPULAR_LANDMARKS[:5]})

    results = []

    # 1. Match local landmarks first
    for item in POPULAR_LANDMARKS:
        if query.lower() in item["name"].lower():
            results.append({
                "display_name": item["name"],
                "lat": item["lat"],
                "lng": item["lng"],
                "type": item["type"]
            })

    # 2. Try Nominatim geocoding if query has 3+ characters
    if len(query) >= 3:
        try:
            headers = {"User-Agent": "KuberRideBookingApp/1.0 (demo-student-project)"}
            url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(query)}&format=json&limit=5&addressdetails=1"
            resp = requests.get(url, headers=headers, timeout=3)
            if resp.status_code == 200:
                geo_data = resp.json()
                for g in geo_data:
                    results.append({
                        "display_name": g.get("display_name"),
                        "lat": float(g.get("lat")),
                        "lng": float(g.get("lon")),
                        "type": g.get("type", "address")
                    })
        except Exception as e:
            logger.warning(f"Nominatim geocoding failed: {e}")

    # Fallback if no results found
    if not results:
        results = POPULAR_LANDMARKS[:4]

    return jsonify({
        "status": "success",
        "data": results[:8]
    })

@location_bp.route("/route", methods=["POST"])
def calculate_route():
    """
    Computes road routing coordinates between pickup and destination.
    Uses OSRM free routing API, with geometric fallback.
    """
    data = request.get_json() or {}
    try:
        start_lat = float(data.get("start_lat"))
        start_lng = float(data.get("start_lng"))
        end_lat = float(data.get("end_lat"))
        end_lng = float(data.get("end_lng"))
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Valid start and end coordinates required"}), 400

    coordinates = []
    distance_km = haversine_distance(start_lat, start_lng, end_lat, end_lng)
    duration_mins = estimate_duration_minutes(distance_km)

    # 1. Query OSRM routing engine
    try:
        osrm_url = f"https://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson"
        resp = requests.get(osrm_url, timeout=3)
        if resp.status_code == 200:
            route_data = resp.json()
            routes = route_data.get("routes", [])
            if routes:
                geom = routes[0].get("geometry", {})
                raw_coords = geom.get("coordinates", [])
                # OSRM returns [lon, lat], convert to [lat, lon] for Leaflet
                coordinates = [[c[1], c[0]] for c in raw_coords]
                distance_km = round(routes[0].get("distance", 0) / 1000.0, 2)
                duration_mins = int(round(routes[0].get("duration", 0) / 60.0))
    except Exception as e:
        logger.warning(f"OSRM routing request failed: {e}")

    # 2. Geometric fallback if OSRM was unreachable
    if not coordinates:
        steps = 15
        for i in range(steps + 1):
            fraction = i / float(steps)
            lat = round(start_lat + (end_lat - start_lat) * fraction, 6)
            lng = round(start_lng + (end_lng - start_lng) * fraction, 6)
            coordinates.append([lat, lng])

    return jsonify({
        "status": "success",
        "data": {
            "coordinates": coordinates,
            "distance_km": distance_km,
            "duration_minutes": duration_mins
        }
    })

