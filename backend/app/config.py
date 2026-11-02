import os
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Config:
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-dev-secret-key-32-chars-min')
    
    # CORS
    CORS_ORIGINS = [origin.strip() for origin in os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',') if origin.strip()]
    
    # Supabase
    SUPABASE_URL = os.getenv('SUPABASE_URL', '')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
    SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET', '')
    
    # Simulation & Rates
    ENABLE_DEMO_SIMULATION = os.getenv('ENABLE_DEMO_SIMULATION', 'true').lower() in ('true', '1', 't')
    BASE_FARE = float(os.getenv('BASE_FARE', 50.0))
    PER_KM_RATE = float(os.getenv('PER_KM_RATE', 12.0))
    PER_MINUTE_RATE = float(os.getenv('PER_MINUTE_RATE', 2.0))

    # Tiers multipliers
    TIER_MULTIPLIERS = {
        'standard': {'base': 1.0, 'rate': 1.0, 'name': 'Kuber Go', 'capacity': 4},
        'comfort': {'base': 1.3, 'rate': 1.3, 'name': 'Kuber Comfort', 'capacity': 4},
        'xl': {'base': 1.8, 'rate': 1.8, 'name': 'Kuber XL', 'capacity': 6}
    }

