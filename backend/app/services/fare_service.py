from app.config import Config
from app.utils.geo import haversine_distance, estimate_duration_minutes

class FareService:
    @staticmethod
    def calculate_fare(distance_km: float, duration_mins: int, vehicle_type: str = "standard") -> dict:
        """
        Calculate fare estimation with transparent cost breakdown for a given vehicle type.
        """
        tier = Config.TIER_MULTIPLIERS.get(vehicle_type.lower(), Config.TIER_MULTIPLIERS["standard"])
        base_multiplier = tier["base"]
        rate_multiplier = tier["rate"]

        base_fare = round(Config.BASE_FARE * base_multiplier, 2)
        distance_charge = round(distance_km * Config.PER_KM_RATE * rate_multiplier, 2)
        time_charge = round(duration_mins * Config.PER_MINUTE_RATE * rate_multiplier, 2)

        total_fare = round(base_fare + distance_charge + time_charge, 2)

        return {
            "vehicle_type": vehicle_type.lower(),
            "tier_name": tier["name"],
            "capacity": tier["capacity"],
            "base_fare": base_fare,
            "distance_km": distance_km,
            "distance_charge": distance_charge,
            "duration_minutes": duration_mins,
            "time_charge": time_charge,
            "total_fare": total_fare,
            "currency": "INR"
        }

    @staticmethod
    def get_all_tier_estimates(pickup_lat: float, pickup_lng: float, dropoff_lat: float, dropoff_lng: float) -> dict:
        """
        Computes distance, travel time, and fare options for all available vehicle tiers.
        """
        distance_km = haversine_distance(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
        duration_mins = estimate_duration_minutes(distance_km)

        tiers = []
        for tier_key in ["standard", "comfort", "xl"]:
            fare_info = FareService.calculate_fare(distance_km, duration_mins, tier_key)
            tiers.append(fare_info)

        return {
            "distance_km": distance_km,
            "duration_minutes": duration_mins,
            "tiers": tiers
        }

