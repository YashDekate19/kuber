-- =====================================================================
-- KUBER APPLICATION DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- =====================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 2. Clean existing tables (Idempotent schema creation)
-- =====================================================================
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.ride_locations CASCADE;
DROP TABLE IF EXISTS public.rides CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =====================================================================
-- 3. PROFILES TABLE (Linked to auth.users)
-- =====================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('passenger', 'driver', 'admin')) DEFAULT 'passenger',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =====================================================================
-- 4. DRIVERS TABLE (Driver-specific profile & state)
-- =====================================================================
CREATE TABLE public.drivers (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    license_number TEXT,
    is_online BOOLEAN NOT NULL DEFAULT false,
    is_available BOOLEAN NOT NULL DEFAULT false,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
    total_rides INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =====================================================================
-- 5. VEHICLES TABLE (Vehicles registered to drivers)
-- =====================================================================
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    color TEXT,
    license_plate TEXT NOT NULL UNIQUE,
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('standard', 'comfort', 'xl')) DEFAULT 'standard',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =====================================================================
-- 6. RIDES TABLE (Core ride lifecycle state machine)
-- =====================================================================
CREATE TABLE public.rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (
        status IN ('pending', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled')
    ) DEFAULT 'pending',
    pickup_address TEXT NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_lat DOUBLE PRECISION NOT NULL,
    dropoff_lng DOUBLE PRECISION NOT NULL,
    distance_km NUMERIC(6,2),
    estimated_duration_mins INTEGER,
    fare_amount NUMERIC(8,2) NOT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'standard',
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- =====================================================================
-- 7. RIDE LOCATIONS (Live tracking breadcrumbs)
-- =====================================================================
CREATE TABLE public.ride_locations (
    id BIGSERIAL PRIMARY KEY,
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION DEFAULT 0,
    speed DOUBLE PRECISION DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =====================================================================
-- 8. PAYMENTS (Ride settlement transactions)
-- =====================================================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    amount NUMERIC(8,2) NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'wallet', 'razorpay')) DEFAULT 'cash',
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'completed',
    transaction_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =====================================================================
-- 9. PERFORMANCE INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_rides_passenger_id ON public.rides(passenger_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON public.rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides(status);
CREATE INDEX IF NOT EXISTS idx_drivers_online_available ON public.drivers(is_online, is_available);
CREATE INDEX IF NOT EXISTS idx_ride_locations_ride_id ON public.ride_locations(ride_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON public.vehicles(driver_id);

-- =====================================================================
-- 10. AUTOMATIC PROFILE CREATION TRIGGER (auth.users -> profiles)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        coalesce(new.raw_user_meta_data->>'phone', ''),
        coalesce(new.raw_user_meta_data->>'role', 'passenger')
    );
    
    -- If registered role is driver, create corresponding driver profile entry
    IF coalesce(new.raw_user_meta_data->>'role', 'passenger') = 'driver' THEN
        INSERT INTO public.drivers (id, is_online, is_available)
        VALUES (new.id, false, false);
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can read all profiles (needed for driver/passenger names), update only their own
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Drivers: Anyone authenticated can see active drivers; drivers can update their own status
CREATE POLICY "Drivers viewable by authenticated users"
    ON public.drivers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Drivers can update their own driver record"
    ON public.drivers FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Vehicles: Viewable by authenticated users; managed by assigned driver
CREATE POLICY "Vehicles viewable by authenticated users"
    ON public.vehicles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Drivers can manage their vehicles"
    ON public.vehicles FOR ALL
    TO authenticated
    USING (auth.uid() = driver_id);

-- Rides: Passengers and assigned drivers can view and update their own rides
CREATE POLICY "Users can view rides they are involved in"
    ON public.rides FOR SELECT
    TO authenticated
    USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

CREATE POLICY "Passengers can insert ride requests"
    ON public.rides FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Involved parties can update ride status"
    ON public.rides FOR UPDATE
    TO authenticated
    USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

-- Ride Locations: Viewable by anyone involved in the ride
CREATE POLICY "Ride locations viewable by ride participants"
    ON public.ride_locations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.rides r
            WHERE r.id = ride_locations.ride_id
            AND (r.passenger_id = auth.uid() OR r.driver_id = auth.uid())
        )
    );

-- Payments: Viewable by ride passenger or driver
CREATE POLICY "Payments viewable by ride participants"
    ON public.payments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.rides r
            WHERE r.id = payments.ride_id
            AND (r.passenger_id = auth.uid() OR r.driver_id = auth.uid())
        )
    );

-- =====================================================================
-- 12. ENABLE REALTIME PUBLICATION
-- =====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'rides'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'drivers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'ride_locations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_locations;
    END IF;
END $$;

