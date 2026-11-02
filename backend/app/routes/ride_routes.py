import logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from app.middleware.auth import token_required
from app.services.matching_service import MatchingService
from app.services.simulation_service import SimulationService
from app.extensions import get_supabase

logger = logging.getLogger(__name__)
ride_bp = Blueprint("rides", __name__, url_prefix="/api/rides")

@ride_bp.route("/<ride_id>", methods=["GET"])
@token_required
def get_ride_details(ride_id):
    """
    Fetches full ride record with passenger, driver, vehicle, and location history.
    """
    user_id = request.current_user["id"]
    supabase = get_supabase()

    if not supabase:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        res = supabase.table("rides").select(
            "*, profiles!rides_passenger_id_fkey(id, full_name, phone, avatar_url), drivers(*, profiles(*)), vehicles(*), payments(*)"
        ).eq("id", ride_id).execute()

        if not res.data:
            return jsonify({"status": "error", "message": "Ride not found"}), 404

        ride = res.data[0]

        # Authorization check: only involved passenger, assigned driver, or admin can access
        if ride["passenger_id"] != user_id and ride.get("driver_id") != user_id:
            return jsonify({"status": "error", "message": "Access denied"}), 403

        # Fetch latest location breadcrumb
        loc_res = supabase.table("ride_locations").select("*").eq("ride_id", ride_id).order("recorded_at", desc=True).limit(20).execute()
        ride["locations"] = loc_res.data or []

        return jsonify({
            "status": "success",
            "data": ride
        })
    except Exception as e:
        logger.error(f"Failed to fetch ride {ride_id}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@ride_bp.route("/<ride_id>/status", methods=["POST"])
@token_required
def update_ride_status(ride_id):
    """
    Transitions ride through state machine:
    pending -> accepted -> driver_arriving -> in_progress -> completed
    """
    user_id = request.current_user["id"]
    data = request.get_json() or {}
    new_status = data.get("status")
    supabase = get_supabase()

    if not supabase:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        res = supabase.table("rides").select("*").eq("id", ride_id).execute()
        if not res.data:
            return jsonify({"status": "error", "message": "Ride not found"}), 404

        ride = res.data[0]
        current_status = ride["status"]

        # Only assigned driver can update progress statuses (except cancel)
        if new_status in ("driver_arriving", "in_progress", "completed"):
            if ride.get("driver_id") != user_id:
                return jsonify({"status": "error", "message": "Only the assigned driver can update this status"}), 403

        # Validate transition
        if not MatchingService.is_valid_transition(current_status, new_status):
            return jsonify({
                "status": "error",
                "message": f"Invalid state transition from '{current_status}' to '{new_status}'."
            }), 400

        now_iso = datetime.now(timezone.utc).isoformat()
        update_fields = {"status": new_status}

        if new_status == "driver_arriving":
            pass
        elif new_status == "in_progress":
            update_fields["started_at"] = now_iso
        elif new_status == "completed":
            update_fields["completed_at"] = now_iso

        update_res = supabase.table("rides").update(update_fields).eq("id", ride_id).execute()

        # Handle completion side effects
        if new_status == "completed":
            # 1. Create completed payment record
            fare_amount = float(ride.get("fare_amount", 0.0))
            supabase.table("payments").insert({
                "ride_id": ride_id,
                "amount": fare_amount,
                "method": data.get("payment_method", "cash"),
                "status": "completed"
            }).execute()

            # 2. Free the driver
            driver_id = ride.get("driver_id")
            if driver_id:
                supabase.table("drivers").update({"is_available": True}).eq("id", driver_id).execute()
                # Increment total rides
                try:
                    d_cur = supabase.table("drivers").select("total_rides").eq("id", driver_id).execute()
                    if d_cur.data:
                        tot = int(d_cur.data[0].get("total_rides", 0)) + 1
                        supabase.table("drivers").update({"total_rides": tot}).eq("id", driver_id).execute()
                except Exception as ex:
                    logger.warning(f"Could not increment driver rides: {ex}")

        return jsonify({
            "status": "success",
            "message": f"Ride status transitioned to '{new_status}'",
            "data": update_res.data[0] if update_res.data else {"status": new_status}
        })
    except Exception as e:
        logger.error(f"Failed to update ride status {ride_id}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@ride_bp.route("/<ride_id>/simulate-step", methods=["POST"])
@token_required
def simulate_driver_step(ride_id):
    """
    Demo/testing simulation endpoint to advance driver coordinates along path.
    """
    data = request.get_json() or {}
    progress = float(data.get("progress", 0.5))
    supabase = get_supabase()

    if not supabase:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        res = supabase.table("rides").select("*").eq("id", ride_id).execute()
        if not res.data:
            return jsonify({"status": "error", "message": "Ride not found"}), 404

        ride = res.data[0]
        driver_id = ride.get("driver_id")

        lat, lng, heading = SimulationService.simulate_step(ride, progress)

        # Record breadcrumb
        supabase.table("ride_locations").insert({
            "ride_id": ride_id,
            "lat": lat,
            "lng": lng,
            "heading": heading,
            "speed": 35.0
        }).execute()

        # Update driver location if assigned
        if driver_id:
            supabase.table("drivers").update({
                "current_lat": lat,
                "current_lng": lng
            }).eq("id", driver_id).execute()

        return jsonify({
            "status": "success",
            "data": {
                "lat": lat,
                "lng": lng,
                "heading": heading,
                "progress": progress
            }
        })
    except Exception as e:
        logger.error(f"Simulation step error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

