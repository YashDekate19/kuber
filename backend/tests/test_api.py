import pytest
from app import create_app
from app.config import Config
from app.services.fare_service import FareService
from app.utils.geo import haversine_distance, estimate_duration_minutes, calculate_bearing, interpolate_points
from app.services.matching_service import MatchingService

class TestConfig(Config):
    TESTING = True
    FLASK_ENV = 'testing'

@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.test_client() as client:
        yield client

def test_health_check(client):
    """Test health check endpoint returns 200 and healthy status"""
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'healthy'
    assert data['service'] == 'Kuber API'

def test_haversine_distance():
    """Test geo distance calculation"""
    # Distance between BLR Airport (13.1986, 77.7066) and MG Road (12.9756, 77.6066) is ~27-28 km
    dist = haversine_distance(13.1986, 77.7066, 12.9756, 77.6066)
    assert 25.0 <= dist <= 30.0

def test_fare_calculation_service():
    """Test fare calculation across Standard, Comfort, XL tiers"""
    estimates = FareService.get_all_tier_estimates(13.1986, 77.7066, 12.9756, 77.6066)
    assert 'distance_km' in estimates
    assert 'duration_minutes' in estimates
    assert len(estimates['tiers']) == 3

    standard = next(t for t in estimates['tiers'] if t['vehicle_type'] == 'standard')
    comfort = next(t for t in estimates['tiers'] if t['vehicle_type'] == 'comfort')
    xl = next(t for t in estimates['tiers'] if t['vehicle_type'] == 'xl')

    # Verify price hierarchy: XL > Comfort > Standard
    assert standard['total_fare'] < comfort['total_fare'] < xl['total_fare']
    assert standard['capacity'] == 4
    assert xl['capacity'] == 6

def test_valid_state_transitions():
    """Test ride state machine transitions"""
    assert MatchingService.is_valid_transition('pending', 'accepted') is True
    assert MatchingService.is_valid_transition('pending', 'cancelled') is True
    assert MatchingService.is_valid_transition('accepted', 'driver_arriving') is True
    assert MatchingService.is_valid_transition('driver_arriving', 'in_progress') is True
    assert MatchingService.is_valid_transition('in_progress', 'completed') is True

    # Invalid transitions
    assert MatchingService.is_valid_transition('pending', 'completed') is False
    assert MatchingService.is_valid_transition('in_progress', 'cancelled') is False
    assert MatchingService.is_valid_transition('completed', 'pending') is False

def test_location_interpolation():
    """Test coordinate interpolation for driver simulation"""
    lat1, lng1 = 12.0, 77.0
    lat2, lng2 = 13.0, 78.0

    # Midpoint (fraction = 0.5)
    mid_lat, mid_lng = interpolate_points(lat1, lng1, lat2, lng2, 0.5)
    assert mid_lat == 12.5
    assert mid_lng == 77.5

