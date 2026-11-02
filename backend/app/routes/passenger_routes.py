import logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from app.middleware.auth import token_required, require_role
from app.services.fare_service import FareService
from app.services.matching_service import MatchingService
from app.services.simulation_service import SimulationService
from app.extensions import get_supabase
from app.config import Config

logger = logging.getLogger(__name__)
passenger_bp = Blueprint("passenger", __name__, url_prefix="/api/passenger")

@passenger_bp.route("/rides/estimate", methods=["POST"])
@token_required
def estimate_ride():
    """
    Computes distance, travel duration, and multi-tier pricing for given coordinates.
    """
    data = request.get_json() or {}
    try:
        p_lat = float(data.get("pickup_lat"))
        p_lng = float(data.get("pickup_lng"))
        d_lat = float(data.get("dropoff_lat"))
        d_lng = float(data.get("dropoff_lng"))
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Valid pickup and dropoff coordinates are required"}), 400

    estimates = FareService.get_all_tier_estimates(p_lat, p_lng, d_lat, d_lng)
    return jsonify({
        "status": "success",
        "data": estimates
    })

@passenger_bp.route("/rides/request", methods=["POST"])
@require_role("passenger")
def request_ride():
    """
    Creates a new ride request in 'pending' status after server-side fare calculation.
    """
    user_id = request.current_user["id"]
    data = request.get_json() or {}
    supabase = get_supabase()

    if not supabase:
        return jsonify({"status": "error", "message": "Database service unavailable"}), 500

    try:
        p_lat = float(data.get("pickup_lat"))
        p_lng = float(data.get("pickup_lng"))
        d_lat = float(data.get("dropoff_lat"))
        d_lng = float(data.get("dropoff_lng"))
        pickup_addr = data.get("pickup_address", f"{round(p_lat, 4)}, {round(p_lng, 4)}")
        dropoff_addr = data.get("dropoff_address", f"{round(d_lat, 4)}, {round(d_lng, 4)}")
        vehicle_type = data.get("vehicle_type", "standard").lower()
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Invalid coordinates or missing ride parameters"}), 400

    # 1. Enforce rule: Passenger cannot have multiple active rides simultaneously
    try:
        existing = supabase.table("rides").select("id, status").eq("passenger_id", user_id).filter("status", "in", "(pending,accepted,driver_arriving,in_progress)").execute()
        if existing.data and len(existing.data) > 0:
            return jsonify({
                "status": "error",
                "message": "You already have an active ride request.",
                "ride_id": existing.data[0]["id"]
            }), 400
    except Exception as e:
        logger.error(f"Error checking active rides: {e}")

    # 2. Server-side authoritative fare computation
    dist_km = FareService.calculate_fare(0, 0)["distance_km"]
    estimate = FareService.calculate_fare(
        FareService.get_all_tier_estimates(p_lat, p_lng, d_lat, d_lng)["distance_km"],
        FareService.get_all_tier_estimates(p_lat, p_lng, d_lat, d_lng)["duration_minutes"],
        vehicle_type
    )

    # 3. Insert ride record
    new_ride = {
        "passenger_id": user_id,
        "pickup_address": pickup_addr,
        "pickup_lat": p_lat,
        "pickup_lng": p_lng,
        "dropoff_address": dropoff_addr,
        "dropoff_lat": d_lat,
        "dropoff_lng": d_lng,
        "distance_km": estimate["distance_km"],
        "estimated_duration_mins": estimate["duration_minutes"],
        "fare_amount": estimate["total_fare"],
        "vehicle_type": vehicle_type,
        "status": "pending"
    }

    try:
        insert_res = supabase.table("rides").insert(new_ride).execute()
        if not insert_res.data:
            return jsonify({"status": "error", "message": "Could not create ride record"}), 500
        
        created_ride = insert_res.data[0]
        ride_id = created_ride["id"]

        # Check for demo mode auto-assignment if requested
        auto_demo = data.get("demo_mode", False) or Config.ENABLE_DEMO_SIMULATION
        if auto_demo and data.get("auto_assign_demo", False):
            # Auto-assign a simulated driver
            demo_driver = SimulationService.get_or_create_demo_driver()
            if demo_driver:
                now_iso = datetime.now(timezone.utc).isoformat()
                supabase.table("rides").update({
                    "driver_id": demo_driver["id"],
                    "vehicle_id": demo_driver["vehicle_id"],
                    "status": "accepted",
                    "accepted_at": now_iso
                }).eq("id", ride_id).execute()

                # Mark driver busy
                supabase.table("drivers").update({"is_available": False}).eq("id", demo_driver["id"]).execute()

                created_ride["status"] = "accepted"
                created_ride["driver_id"] = demo_driver["id"]

        return jsonify({
            "status": "success",
            "message": "Ride requested successfully",
            "data": created_ride
        }), 201
    except Exception as e:
        logger.error(f"Failed to create ride: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@passenger_bp.route("/rides/active", methods=["GET"])
@require_role("passenger")
def get_active_ride():
    """
    Returns passenger's current active ride, driver info, and latest location.
    """
    user_id = request.current_user["id"]
    supabase = get_supabase()
    if not supabase:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        res = supabase.table("rides").select(
            "*, drivers(*, profiles(*)), vehicles(*)"
        ).eq("passenger_id", user_id).filter("status", "in", "(pending,accepted,driver_arriving,in_progress)").order("created_at", desc=True).limit(1).execute()

        if not res.data:
            return jsonify({"status": "success", "data": None})

        ride = res.data[0]
        
        # Fetch latest driver location breadcrumb
        loc_res = supabase.table("ride_locations").select("*").eq("ride_id", ride["id"]).order("recorded_at", desc=True).limit(1).execute()
        latest_loc = loc_res.data[0] if loc_res.data else None
        ride["latest_location"] = latest_loc

        return jsonify({"status": "success", "data": ride})
    except Exception as e:
        logger.error(f"Failed to fetch active ride: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@passenger_bp.route("/rides/<ride_id>/cancel", methods=["POST"])
@require_role("passenger")
def cancel_ride(ride_id):
    """
    Cancels a ride if it is in 'pending' or 'accepted' status.
    """
    user_id = request.current_user["id"]
    data = request.get_json() or {}
    reason = data.get("reason", "Cancelled by passenger")
    supabase = get_supabase()

    if not supabase:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        res = supabase.table("rides").select("*").eq("id", ride_id).eq("passenger_id", user_id).execute()
        if not res.data:
            return jsonify({"status": "error", "message": "Ride not found or unauthorized"}), 404

        ride = res.data[0]
        current_status = ride["status"]

        if not MatchingService.is_valid_transition(current_status, "cancelled"):
            return jsonify({
                "status": "error",
                "message": f"Cannot cancel a ride that is already in '{current_status}' status."
            }), 400

        now_iso = datetime.now(timezone.utc).isoformat()
        update_res = supabase.table("rides").update({
            "status": "cancelled",
            "cancellation_reason": reason,
            "cancelled_at": now_iso
        }).eq("id", ride_id).execute()

        # Free driver if assigned
        if ride.get("driver_id"):
            supabase.table("drivers").update({"is_available": True}).eq("id", ride["driver_id"]).execute()

        return jsonify({
            "status": "success",
            "message": "Ride cancelled successfully",
            "data": update_res.data[0] if update_res.data else {"id": ride_id, "status": "cancelled"}
        })
    except Exception as e:
        logger.error(f"Failed to cancel ride {ride_id}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@passenger_bp.route("/rides/history", methods=["GET"])
@require_role("passenger")
def ride_history():
    """
    Retrieves passenger ride history (completed and cancelled trips).
    """
    user_id = request.current_user["id"]
    supabase = get_supabase()
    if not supabase:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        res = supabase.table("rides").select(
            "*, drivers(*, profiles(*)), vehicles(*), payments(*)"
        ).eq("passenger_id", user_id).order("created_at", desc=True).limit(50).execute()

        return jsonify({
            "status": "success",
            "data": res.data or []
        })
    except Exception as e:
        logger.error(f"Failed to fetch ride history: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

