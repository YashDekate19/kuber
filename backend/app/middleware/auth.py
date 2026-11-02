import functools
import logging
import jwt
from flask import request, jsonify
from app.config import Config
from app.extensions import get_supabase

logger = logging.getLogger(__name__)

def verify_token(token: str):
    """
    Verifies Supabase JWT token and extracts user information.
    """
    if not token:
        return None, "Token is missing"
    
    try:
        # Decode using the Supabase JWT Secret
        payload = jwt.decode(
            token,
            Config.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "Token has expired"
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None, "Invalid token"
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return None, "Token verification failed"

def token_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({
                "status": "error",
                "message": "Authorization header missing or invalid format (Bearer <token> required)"
            }), 401
        
        token = auth_header.split(" ")[1].strip()
        payload, error = verify_token(token)
        
        if error:
            return jsonify({
                "status": "error",
                "message": error
            }), 401
        
        user_id = payload.get("sub")
        email = payload.get("email", "")

        # Fetch profile and role from Supabase
        supabase = get_supabase()
        role = "passenger"
        profile_data = {}
        
        if supabase:
            try:
                res = supabase.table("profiles").select("*").eq("id", user_id).execute()
                if res.data and len(res.data) > 0:
                    profile_data = res.data[0]
                    role = profile_data.get("role", "passenger")
                else:
                    # User exists in auth but profile not yet synced
                    user_metadata = payload.get("user_metadata", {})
                    meta_role = user_metadata.get("role", "passenger")
                    full_name = user_metadata.get("full_name", email.split("@")[0] if email else "User")
                    
                    # Upsert profile
                    insert_res = supabase.table("profiles").upsert({
                        "id": user_id,
                        "email": email,
                        "role": meta_role,
                        "full_name": full_name
                    }).execute()
                    
                    if insert_res.data:
                        profile_data = insert_res.data[0]
                        role = meta_role
            except Exception as e:
                logger.error(f"Error querying profile for user {user_id}: {e}")
                # Fallback to metadata
                role = payload.get("user_metadata", {}).get("role", "passenger")
        else:
            role = payload.get("user_metadata", {}).get("role", "passenger")

        request.current_user = {
            "id": user_id,
            "email": email,
            "role": role,
            "profile": profile_data
        }

        return f(*args, **kwargs)
    return decorated

def require_role(required_role: str):
    """
    Decorator to restrict endpoint access by user role ('passenger' or 'driver').
    """
    def decorator(f):
        @functools.wraps(f)
        @token_required
        def decorated(*args, **kwargs):
            current_user = getattr(request, "current_user", {})
            user_role = current_user.get("role")
            
            if user_role != required_role:
                return jsonify({
                    "status": "error",
                    "message": f"Access denied. Requires '{required_role}' role, but user has '{user_role}' role."
                }), 403
                
            return f(*args, **kwargs)
        return decorated
    return decorator

