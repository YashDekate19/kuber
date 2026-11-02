export type UserRole = 'passenger' | 'driver' | 'admin';

export type RideStatus =
  | 'pending'
  | 'accepted'
  | 'driver_arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type VehicleType = 'standard' | 'comfort' | 'xl';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Driver {
  id: string;
  license_number?: string;
  is_online: boolean;
  is_available: boolean;
  current_lat?: number;
  current_lng?: number;
  rating: number;
  total_rides: number;
  profiles?: UserProfile;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  vehicle_type: VehicleType;
  is_active: boolean;
}

export interface RideLocation {
  id: number;
  ride_id: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  recorded_at: string;
}

export interface Payment {
  id: string;
  ride_id: string;
  amount: number;
  method: 'cash' | 'wallet' | 'razorpay';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

export interface Ride {
  id: string;
  passenger_id: string;
  driver_id?: string;
  vehicle_id?: string;
  status: RideStatus;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  distance_km: number;
  estimated_duration_mins: number;
  fare_amount: number;
  vehicle_type: VehicleType;
  cancellation_reason?: string;
  created_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  profiles?: UserProfile;
  drivers?: Driver;
  vehicles?: Vehicle;
  payments?: Payment[];
  latest_location?: RideLocation;
  locations?: RideLocation[];
}

export interface FareTier {
  vehicle_type: VehicleType;
  tier_name: string;
  capacity: number;
  base_fare: number;
  distance_km: number;
  distance_charge: number;
  duration_minutes: number;
  time_charge: number;
  total_fare: number;
  currency: string;
}

export interface FareEstimateResponse {
  distance_km: number;
  duration_minutes: number;
  tiers: FareTier[];
}

export interface PlaceSuggestion {
  display_name: string;
  lat: number;
  lng: number;
  type?: string;
}

