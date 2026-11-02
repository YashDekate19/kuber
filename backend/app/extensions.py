import logging
from supabase import create_client, Client
from app.config import Config

logger = logging.getLogger(__name__)

supabase_admin: Client = None

def init_supabase():
    global supabase_admin
    if not Config.SUPABASE_URL or not Config.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Supabase credentials not configured in environment!")
        return None
    try:
        supabase_admin = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
        logger.info("Supabase admin client initialized successfully.")
        return supabase_admin
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None

def get_supabase() -> Client:
    global supabase_admin
    if supabase_admin is None:
        init_supabase()
    return supabase_admin

