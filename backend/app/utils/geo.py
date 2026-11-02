import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on the earth in kilometers.
    """
    r = 6371.0  # Earth's radius in kilometers

    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)

def estimate_duration_minutes(distance_km: float, avg_speed_kmh: float = 25.0) -> int:
    """
    Estimate trip duration in minutes given distance and city traffic average speed.
    Adds a base 3-minute traffic/signal buffer.
    """
    if distance_km <= 0:
        return 2
    travel_time_hours = distance_km / avg_speed_kmh
    travel_time_minutes = travel_time_hours * 60
    # Add traffic buffer and round
    return max(3, int(round(travel_time_minutes + 3)))

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the initial bearing (compass heading in degrees) from point 1 to point 2.
    """
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    d_lon = math.radians(lon2 - lon1)

    x = math.sin(d_lon) * math.cos(lat2_r)
    y = math.cos(lat1_r) * math.sin(lat2_r) - (math.sin(lat1_r) * math.cos(lat2_r) * math.cos(d_lon))
    initial_bearing = math.atan2(x, y)

    # Convert radians to degrees and normalize to 0-360
    initial_bearing = math.degrees(initial_bearing)
    compass_bearing = (initial_bearing + 360) % 360
    return round(compass_bearing, 1)

def interpolate_points(lat1: float, lon1: float, lat2: float, lon2: float, fraction: float):
    """
    Returns interpolated (lat, lng) at a given fraction (0.0 to 1.0) along linear path.
    """
    fraction = max(0.0, min(1.0, fraction))
    lat = lat1 + (lat2 - lat1) * fraction
    lng = lon1 + (lon2 - lon1) * fraction
    return round(lat, 6), round(lng, 6)

