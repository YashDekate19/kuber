import logging
import random
import uuid
from app.extensions import get_supabase
from app.utils.geo import interpolate_points, calculate_bearing, haversine_distance

logger = logging.getLogger(__name__)

# Sample demo driver profiles
MOCK_DRIVER_TEMPLATES = [
    {
        "name": "Rajesh Kumar (Demo)",
        "phone": "+91 98765 43210",
        "rating": 4.92,
        "total_rides": 1240,
        "vehicle": {"make": "Maruti Suzuki", "model": "Dzire", "color": "Silver", "plate": "KA 01 AB 1234", "type": "standard"}
    },
    {
        "name": "Amit Sharma (Demo)",
        "phone": "+91 98123 45678",
        "rating": 4.88,
        "total_rides": 890,
        "vehicle": {"make": "Hyundai", "model": "Aura", "color": "White", "plate": "KA 03 CD 5678", "type": "standard"}
    },
    {
        "name": "Suresh Patel (Demo)",
        "phone": "+91 99887 76655",
        "rating": 4.95,
        "total_rides": 2100,
        "vehicle": {"make": "Toyota", "model": "Innova Crysta", "color": "Black", "plate": "KA 05 EF 9012", "type": "xl"}
    }
]

class SimulationService:
    @staticmethod
    def get_or_create_demo_driver():
        """
        Retrieves or creates a mock driver in Supabase for testing purposes.
        """
        supabase = get_supabase()
        if not supabase:
            return None

        try:
            # Check if any demo driver already exists in profiles
            res = supabase.table("profiles").select("id, full_name, role, drivers(*), vehicles(*)").eq("role", "driver").like("full_name", "%Demo%").limit(1).execute()
            if res.data and len(res.data) > 0:
                driver_profile = res.data[0]
                driver_id = driver_profile["id"]
                vehicles = driver_profile.get("vehicles", [])
                vehicle_id = vehicles[0]["id"] if vehicles else None
                return {
                    "id": driver_id,
                    "profile": driver_profile,
                    "vehicle_id": vehicle_id
                }

            # If no demo driver exists, create one
            template = random.choice(MOCK_DRIVER_TEMPLATES)
            demo_user_id = str(uuid.uuid4())
            demo_email = f"driver.demo.{demo_user_id[:8]}@kuber.local"

            # Insert profile
            supabase.table("profiles").insert({
                "id": demo_user_id,
                "email": demo_email,
                "full_name": template["name"],
                "phone": template["phone"],
                "role": "driver"
            }).execute()

            # Insert driver record
            supabase.table("drivers").insert({
                "id": demo_user_id,
                "license_number": f"DL-DEMO-{random.randint(10000, 99999)}",
                "is_online": True,
                "is_available": True,
                "rating": template["rating"],
                "total_rides": template["total_rides"]
            }).execute()

            # Insert vehicle
            v = template["vehicle"]
            v_res = supabase.table("vehicles").insert({
                "driver_id": demo_user_id,
                "make": v["make"],
                "model": v["model"],
                "year": 2023,
                "color": v["color"],
                "license_plate": v["plate"],
                "vehicle_type": v["type"]
            }).execute()

            vehicle_id = v_res.data[0]["id"] if v_res.data else None

            return {
                "id": demo_user_id,
                "profile": template,
                "vehicle_id": vehicle_id
            }
        except Exception as e:
            logger.error(f"Failed to create demo driver: {e}")
            return None

    @staticmethod
    def simulate_step(ride: dict, fraction: float):
        """
        Calculates driver's simulated location given a progress fraction (0.0 to 1.0).
        If status is driver_arriving: moves from initial offset to pickup.
        If status is in_progress: moves from pickup to dropoff.
        """
        status = ride.get("status")
        pickup_lat = ride["pickup_lat"]
        pickup_lng = ride["pickup_lng"]
        dropoff_lat = ride["dropoff_lat"]
        dropoff_lng = ride["dropoff_lng"]

        if status in ("accepted", "driver_arriving"):
            # Driver starts ~1.5km away from pickup
            start_lat = pickup_lat + 0.012
            start_lng = pickup_lng + 0.010
            target_lat, target_lng = pickup_lat, pickup_lng
        elif status == "in_progress":
            start_lat, start_lng = pickup_lat, pickup_lng
            target_lat, target_lng = dropoff_lat, dropoff_lng
        else:
            return pickup_lat, pickup_lng, 0.0

        current_lat, current_lng = interpolate_points(start_lat, start_lng, target_lat, target_lng, fraction)
        bearing = calculate_bearing(start_lat, start_lng, target_lat, target_lng)
        return current_lat, current_lng, bearing

