import logging
from flask import Blueprint, request, jsonify
from app.middleware.auth import token_required
from app.extensions import get_supabase

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/sync", methods=["POST"])
@token_required
def sync_user():
    """
    Syncs user profile from frontend authentication to PostgreSQL profiles table.
    """
    user = request.current_user
    user_id = user["id"]
    email = user["email"]
    data = request.get_json() or {}

    role = data.get("role", user.get("role", "passenger"))
    full_name = data.get("full_name") or user.get("profile", {}).get("full_name") or email.split("@")[0]
    phone = data.get("phone", "")

    supabase = get_supabase()
    if not supabase:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        # Upsert profiles table
        profile_res = supabase.table("profiles").upsert({
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "phone": phone,
            "role": role
        }).execute()

        # If driver role, ensure record exists in drivers table
        if role == "driver":
            supabase.table("drivers").upsert({
                "id": user_id,
                "is_online": False,
                "is_available": False
            }).execute()

        return jsonify({
            "status": "success",
            "message": "User profile synchronized successfully",
            "data": profile_res.data[0] if profile_res.data else {"id": user_id, "role": role}
        })
    except Exception as e:
        logger.error(f"Failed to sync user {user_id}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user_profile():
    """
    Returns authenticated user's profile, role, vehicle (if driver), and active ride (if any).
    """
    user = request.current_user
    user_id = user["id"]
    role = user["role"]
    supabase = get_supabase()

    if not supabase:
        return jsonify({"status": "success", "data": user})

    try:
        profile_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        profile = profile_res.data[0] if profile_res.data else user.get("profile", {})

        driver_info = None
        vehicle_info = None
        if role == "driver":
            d_res = supabase.table("drivers").select("*").eq("id", user_id).execute()
            if d_res.data:
                driver_info = d_res.data[0]
            v_res = supabase.table("vehicles").select("*").eq("driver_id", user_id).eq("is_active", True).execute()
            if v_res.data:
                vehicle_info = v_res.data[0]

        # Check for active ride
        active_filter = "status.in.(pending,accepted,driver_arriving,in_progress)"
        if role == "passenger":
            ride_query = supabase.table("rides").select("*, drivers(*, profiles(*)), vehicles(*)").eq("passenger_id", user_id).filter("status", "in", "(pending,accepted,driver_arriving,in_progress)").order("created_at", desc=True).limit(1)
        else:
            ride_query = supabase.table("rides").select("*, profiles!rides_passenger_id_fkey(*), vehicles(*)").eq("driver_id", user_id).filter("status", "in", "(accepted,driver_arriving,in_progress)").order("created_at", desc=True).limit(1)

        ride_res = ride_query.execute()
        active_ride = ride_res.data[0] if ride_res.data else None

        return jsonify({
            "status": "success",
            "data": {
                "user": profile,
                "role": role,
                "driver": driver_info,
                "vehicle": vehicle_info,
                "active_ride": active_ride
            }
        })
    except Exception as e:
        logger.error(f"Error fetching profile details: {e}")
        return jsonify({"status": "success", "data": user})

