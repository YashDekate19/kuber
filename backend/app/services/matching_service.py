import logging
from app.extensions import get_supabase
from app.utils.geo import haversine_distance
from app.config import Config

logger = logging.getLogger(__name__)

VALID_TRANSITIONS = {
    "pending": ["accepted", "cancelled"],
    "accepted": ["driver_arriving", "cancelled"],
    "driver_arriving": ["in_progress", "cancelled"],
    "in_progress": ["completed"],
    "completed": [],
    "cancelled": []
}

class MatchingService:
    @staticmethod
    def is_valid_transition(current_status: str, new_status: str) -> bool:
        allowed = VALID_TRANSITIONS.get(current_status, [])
        return new_status in allowed

    @staticmethod
    def find_nearby_drivers(pickup_lat: float, pickup_lng: float, max_radius_km: float = 15.0):
        """
        Finds online and available drivers sorted by proximity to pickup point.
        """
        supabase = get_supabase()
        if not supabase:
            return []

        try:
            # Query drivers who are online and available
            res = supabase.table("drivers").select(
                "id, license_number, is_online, is_available, current_lat, current_lng, rating, total_rides, profiles(full_name, phone, avatar_url), vehicles(*)"
            ).eq("is_online", True).eq("is_available", True).execute()

            drivers = res.data or []
            nearby = []

            for d in drivers:
                lat = d.get("current_lat")
                lng = d.get("current_lng")
                if lat is not None and lng is not None:
                    dist = haversine_distance(pickup_lat, pickup_lng, lat, lng)
                    if dist <= max_radius_km:
                        d["distance_to_pickup_km"] = dist
                        nearby.append(d)

            # Sort by distance
            nearby.sort(key=lambda x: x.get("distance_to_pickup_km", 999))
            return nearby
        except Exception as e:
            logger.error(f"Error querying nearby drivers: {e}")
            return []

    @staticmethod
    def auto_assign_or_simulate(ride_id: str, pickup_lat: float, pickup_lng: float, vehicle_type: str = "standard"):
        """
        If real drivers are available, notifies them.
        If demo mode is active and no driver accepts, provides a simulated driver.
        """
        supabase = get_supabase()
        if not supabase:
            return None

        nearby = MatchingService.find_nearby_drivers(pickup_lat, pickup_lng)
        if nearby:
            return {"status": "broadcasted", "drivers_notified": len(nearby)}

        if Config.ENABLE_DEMO_SIMULATION:
            logger.info(f"No active drivers found. Demo simulation enabled for ride {ride_id}.")
            return {"status": "simulated_eligible"}
        
        return {"status": "waiting_for_drivers"}

