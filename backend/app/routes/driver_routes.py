import logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from app.middleware.auth import token_required, require_role
from app.services.matching_service import MatchingService
from app.extensions import get_supabase

logger = logging.getLogger(__name__)
driver_bp = Blueprint("driver", __name__, url_prefix="/api/driver")

@driver_bp.route("/status", methods=["POST"])
@require_role("driver")
def update_status():
    """
    Toggles driver online/offline status.
    """
    user_id = request.current_user["id"]
    data = request.get_json() or {}
    is_online = bool(data.get("is_online", False))
    supabase = get_supabase()

    if not supabase:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        res = supabase.table("drivers").upsert({
            "id": user_id,
            "is_online": is_online,
            "is_available": is_online  # when going online, becomes available for rides
        }).execute()

        return jsonify({
            "status": "success",
            "message": f"Driver is now {'online' if is_online else 'offline'}",
            "data": res.data[0] if res.data else {"is_online": is_online}
        })
    except Exception as e:
        logger.error(f"Failed to update driver status: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@driver_bp.route("/location", methods=["POST"])
@require_role("driver")
def update_location():
    """
    Updates driver's real-time coordinates.
    If the driver is on an active trip, automatically records location breadcrumb.
    """
    user_id = request.current_user["id"]
    data = request.get_json() or {}
    supabase = get_supabase()

    try:
        lat = float(data.get("lat"))
        lng = float(data.get("lng"))
        heading = float(data.get("heading", 0.0))
        speed = float(data.get("speed", 0.0))
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Valid lat and lng coordinates required"}), 400

    if not supabase:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        # 1. Update driver's current position
        supabase.table("drivers").update({
            "current_lat": lat,
            "current_lng": lng,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", user_id).execute()

        # 2. Check if driver has an active ride in progress or arriving
        ride_res = supabase.table("rides").select("id, status").eq("driver_id", user_id).filter("status", "in", "(accepted,driver_arriving,in_progress)").limit(1).execute()

        if ride_res.data:
            active_ride_id = ride_res.data[0]["id"]
            # Insert breadcrumb
            supabase.table("ride_locations").insert({
                "ride_id": active_ride_id,
                "lat": lat,
                "lng": lng,
                "heading": heading,
                "speed": speed
            }).execute()

        return jsonify({
            "status": "success",
            "message": "Location updated successfully",
            "data": {"lat": lat, "lng": lng, "heading": heading}
        })
    except Exception as e:
        logger.error(f"Failed to update location for driver {user_id}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@driver_bp.route("/rides/available", methods=["GET"])
@require_role("driver")
def get_available_rides():
    """
    Fetches pending ride requests available for acceptance.
    """
    user_id = request.current_user["id"]
    supabase = get_supabase()
    if not supabase:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        # Check driver is online
        d_res = supabase.table("drivers").select("is_online, is_available").eq("id", user_id).execute()
        if not d_res.data or not d_res.data[0].get("is_online"):
            return jsonify({
                "status": "success",
                "message": "Driver is offline",
                "data": []
            })

        # Fetch pending rides
        res = supabase.table("rides").select(
            "*, profiles!rides_passenger_id_fkey(full_name, phone, avatar_url)"
        ).eq("status", "pending").order("created_at", desc=True).limit(20).execute()

        return jsonify({
            "status": "success",
            "data": res.data or []
        })
    except Exception as e:
        logger.error(f"Failed to fetch available rides: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@driver_bp.route("/rides/<ride_id>/accept", methods=["POST"])
@require_role("driver")
def accept_ride(ride_id):
    """
    Driver accepts a pending ride request.
    Enforces atomic acceptance to prevent duplicate driver assignment.
    """
    driver_id = request.current_user["id"]
    supabase = get_supabase()
    if not supabase:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        # Verify driver has active vehicle
        v_res = supabase.table("vehicles").select("id").eq("driver_id", driver_id).eq("is_active", True).limit(1).execute()
        vehicle_id = v_res.data[0]["id"] if v_res.data else None

        now_iso = datetime.now(timezone.utc).isoformat()

        # Atomic update: only succeeds if status is still 'pending'
        update_res = supabase.table("rides").update({
            "status": "accepted",
            "driver_id": driver_id,
            "vehicle_id": vehicle_id,
            "accepted_at": now_iso
        }).eq("id", ride_id).eq("status", "pending").execute()

        if not update_res.data:
            return jsonify({
                "status": "error",
                "message": "Ride is no longer available or was accepted by another driver."
            }), 409

        # Mark driver unavailable
        supabase.table("drivers").update({"is_available": False}).eq("id", driver_id).execute()

        return jsonify({
            "status": "success",
            "message": "Ride accepted successfully",
            "data": update_res.data[0]
        })
    except Exception as e:
        logger.error(f"Failed to accept ride {ride_id}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@driver_bp.route("/dashboard", methods=["GET"])
@require_role("driver")
def driver_dashboard():
    """
    Returns driver statistics: active ride, total earnings, completed trips count.
    """
    driver_id = request.current_user["id"]
    supabase = get_supabase()
    if not supabase:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        # Driver info
        d_res = supabase.table("drivers").select("*, vehicles(*)").eq("id", driver_id).execute()
        driver_info = d_res.data[0] if d_res.data else {}

        # Active ride
        active_res = supabase.table("rides").select(
            "*, profiles!rides_passenger_id_fkey(full_name, phone, avatar_url), vehicles(*)"
        ).eq("driver_id", driver_id).filter("status", "in", "(accepted,driver_arriving,in_progress)").order("created_at", desc=True).limit(1).execute()
        active_ride = active_res.data[0] if active_res.data else None

        # Earnings calculation (sum of completed rides)
        history_res = supabase.table("rides").select("fare_amount").eq("driver_id", driver_id).eq("status", "completed").execute()
        completed_rides = history_res.data or []
        total_earnings = sum(float(r.get("fare_amount", 0)) for r in completed_rides)
        total_trips = len(completed_rides)

        return jsonify({
            "status": "success",
            "data": {
                "driver": driver_info,
                "active_ride": active_ride,
                "total_earnings": round(total_earnings, 2),
                "total_completed_trips": total_trips,
                "rating": driver_info.get("rating", 5.0)
            }
        })
    except Exception as e:
        logger.error(f"Failed to load driver dashboard: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@driver_bp.route("/vehicle", methods=["POST", "GET"])
@require_role("driver")
def manage_vehicle():
    """
    Registers or retrieves the driver's vehicle.
    """
    driver_id = request.current_user["id"]
    supabase = get_supabase()

    if request.method == "GET":
        res = supabase.table("vehicles").select("*").eq("driver_id", driver_id).order("created_at", desc=True).execute()
        return jsonify({"status": "success", "data": res.data or []})

    data = request.get_json() or {}
    make = data.get("make")
    model = data.get("model")
    year = data.get("year", 2023)
    color = data.get("color", "White")
    plate = data.get("license_plate")
    v_type = data.get("vehicle_type", "standard").lower()

    if not make or not model or not plate:
        return jsonify({"status": "error", "message": "Make, model, and license plate are required"}), 400

    try:
        res = supabase.table("vehicles").upsert({
            "driver_id": driver_id,
            "make": make,
            "model": model,
            "year": int(year),
            "color": color,
            "license_plate": plate,
            "vehicle_type": v_type,
            "is_active": True
        }).execute()

        return jsonify({
            "status": "success",
            "message": "Vehicle saved successfully",
            "data": res.data[0] if res.data else {}
        })
    except Exception as e:
        logger.error(f"Failed to save vehicle: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

