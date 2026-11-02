import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

supabase_url = os.getenv('SUPABASE_URL')
service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not service_key:
    print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env")
    exit(1)

supabase = create_client(supabase_url, service_key)

users_to_create = [
    {
        "email": "yashdekate31@gmail.com",
        "password": "Password123!",
        "full_name": "Yash Dekate",
        "phone": "09665486040",
        "role": "passenger"
    },
    {
        "email": "passenger.test@kuber.local",
        "password": "Password123!",
        "full_name": "Demo Passenger",
        "phone": "9876543210",
        "role": "passenger"
    },
    {
        "email": "driver.test@kuber.local",
        "password": "Password123!",
        "full_name": "Demo Driver",
        "phone": "9812345678",
        "role": "driver"
    }
]

print("Seeding users directly via Supabase Admin API (Bypasses email rate limits)...")

for u in users_to_create:
    try:
        # Check if user already exists
        res = supabase.auth.admin.create_user({
            "email": u["email"],
            "password": u["password"],
            "email_confirm": True,
            "user_metadata": {
                "full_name": u["full_name"],
                "phone": u["phone"],
                "role": u["role"]
            }
        })
        print(f"Created: {u['email']} (role: {u['role']})")
    except Exception as e:
        err_str = str(e)
        if "already registered" in err_str or "already exists" in err_str:
            print(f"User {u['email']} already exists. Updating password and confirming...")
            # Try updating user password
            try:
                # Find user id
                users_list = supabase.auth.admin.list_users()
                for existing_user in users_list:
                    if existing_user.email == u["email"]:
                        supabase.auth.admin.update_user_by_id(
                            existing_user.id,
                            {
                                "password": u["password"],
                                "email_confirm": True,
                                "user_metadata": {
                                    "full_name": u["full_name"],
                                    "phone": u["phone"],
                                    "role": u["role"]
                                }
                            }
                        )
                        print(f"Updated password and confirmed email for: {u['email']}")
                        break
            except Exception as update_err:
                print(f"Could not update {u['email']}: {update_err}")
        else:
            print(f"Error for {u['email']}: {e}")

