'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { InteractiveMap } from '@/components/map/InteractiveMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { supabase } from '@/lib/supabaseClient';
import { Ride, RideStatus } from '@/types';
import { formatCurrency, formatDistance, formatDuration, formatTimestamp } from '@/lib/utils';
import {
  Car,
  User,
  Phone,
  Shield,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Play,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  RideStatus,
  { label: string; badgeVariant: 'default' | 'emerald' | 'amber' | 'blue' | 'destructive'; desc: string }
> = {
  pending: {
    label: 'Finding your driver...',
    badgeVariant: 'amber',
    desc: 'Connecting with nearby available drivers in your area.',
  },
  accepted: {
    label: 'Driver Assigned',
    badgeVariant: 'blue',
    desc: 'Your driver has accepted and will start heading to you.',
  },
  driver_arriving: {
    label: 'Driver Arriving',
    badgeVariant: 'blue',
    desc: 'Driver is approaching your pickup location.',
  },
  in_progress: {
    label: 'Trip in Progress',
    badgeVariant: 'emerald',
    desc: 'You are on your way to the destination.',
  },
  completed: {
    label: 'Trip Completed',
    badgeVariant: 'emerald',
    desc: 'You have reached your destination. Thank you for riding with Kuber!',
  },
  cancelled: {
    label: 'Ride Cancelled',
    badgeVariant: 'destructive',
    desc: 'This ride request has been cancelled.',
  },
};

export default function TrackRidePage() {
  const params = useParams();
  const router = useRouter();
  const rideId = params?.id as string;

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [driverCoord, setDriverCoord] = useState<{ lat: number; lng: number; heading?: number } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0.2);

  // 1. Fetch Ride details
  const fetchRide = async () => {
    if (!rideId) return;
    const { data, error } = await api.get<Ride>(`/api/rides/${rideId}`);
    if (data) {
      setRide(data);
      if (data.latest_location) {
        setDriverCoord({
          lat: data.latest_location.lat,
          lng: data.latest_location.lng,
          heading: data.latest_location.heading,
        });
      } else if (data.drivers?.current_lat && data.drivers?.current_lng) {
        setDriverCoord({
          lat: data.drivers.current_lat,
          lng: data.drivers.current_lng,
        });
      }
    } else if (error) {
      console.error('Fetch ride error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRide();

    // 2. Poll every 3 seconds for updates
    const interval = setInterval(() => {
      fetchRide();
    }, 3000);

    // 3. Supabase Realtime channel subscription
    const channel = supabase
      .channel(`ride-${rideId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        (payload) => {
          if (payload.new) {
            setRide((prev) => (prev ? { ...prev, ...(payload.new as any) } : (payload.new as any)));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ride_locations', filter: `ride_id=eq.${rideId}` },
        (payload) => {
          if (payload.new) {
            setDriverCoord({
              lat: (payload.new as any).lat,
              lng: (payload.new as any).lng,
              heading: (payload.new as any).heading,
            });
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  // Fetch route polyline when ride loads
  useEffect(() => {
    if (!ride) return;
    api.post<{ coordinates: [number, number][] }>('/api/location/route', {
      start_lat: ride.pickup_lat,
      start_lng: ride.pickup_lng,
      end_lat: ride.dropoff_lat,
      end_lng: ride.dropoff_lng,
    }).then(({ data }) => {
      if (data && data.coordinates) {
        setRouteCoordinates(data.coordinates);
      }
    });
  }, [ride?.pickup_lat, ride?.dropoff_lat]);

  // Cancel ride handler
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this ride?')) return;
    setCancelling(true);
    const { data, error } = await api.post(`/api/passenger/rides/${rideId}/cancel`, {
      reason: 'Cancelled by passenger from app',
    });
    setCancelling(false);

    if (error) {
      toast.error('Cancel Failed', { description: error });
    } else {
      toast.success('Ride cancelled');
      fetchRide();
    }
  };

  // Demo step simulator: moves the driver car along the route!
  const handleSimulateStep = async () => {
    setSimulating(true);
    const nextProgress = Math.min(1.0, simProgress + 0.2);
    setSimProgress(nextProgress);

    const { data } = await api.post(`/api/rides/${rideId}/simulate-step`, {
      progress: nextProgress,
    });

    if (data) {
      setDriverCoord({
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
      });
      toast.success(`Driver location updated (Progress: ${Math.round(nextProgress * 100)}%)`);
    }
    setSimulating(false);
  };

  if (loading) {
    return (
      <RoleGuard allowedRole="passenger">
        <div className="flex h-screen w-full items-center justify-center bg-neutral-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-black" />
            <p className="text-sm font-medium text-neutral-500">Connecting to ride tracking...</p>
          </div>
        </div>
      </RoleGuard>
    );
  }

  if (!ride) {
    return (
      <RoleGuard allowedRole="passenger">
        <div className="min-h-screen bg-neutral-50 flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
            <Card className="p-8 text-center max-w-md">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold">Ride Not Found</h3>
              <p className="text-sm text-neutral-500 mb-4">This ride does not exist or has expired.</p>
              <Button onClick={() => router.push('/passenger/book')}>Book a New Ride</Button>
            </Card>
          </div>
        </div>
      </RoleGuard>
    );
  }

  const statusInfo = STATUS_CONFIG[ride.status] || STATUS_CONFIG.pending;
  const isCompleted = ride.status === 'completed';
  const isCancelled = ride.status === 'cancelled';
  const canCancel = ride.status === 'pending' || ride.status === 'accepted';

  return (
    <RoleGuard allowedRole="passenger">
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navbar />

        <div className="flex-1 container mx-auto px-4 sm:px-6 py-6">
          <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)] min-h-[650px]">
            {/* Left Column: Live Status & Driver Details */}
            <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
              {/* Main Ride Status Card */}
              <Card className="p-6 rounded-3xl shadow-sm border-neutral-100 bg-white space-y-5">
                <div className="flex items-center justify-between">
                  <Badge variant={statusInfo.badgeVariant} className="px-3.5 py-1 text-xs uppercase tracking-wider">
                    {ride.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm font-bold text-neutral-900">
                    {formatCurrency(ride.fare_amount)}
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl font-black tracking-tight text-neutral-950">
                    {statusInfo.label}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    {statusInfo.desc}
                  </p>
                </div>

                {/* Locations Summary */}
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold text-neutral-400 uppercase">Pickup</p>
                      <p className="text-xs font-semibold text-neutral-800 line-clamp-1">
                        {ride.pickup_address}
                      </p>
                    </div>
                  </div>
                  <div className="border-l border-dashed border-neutral-300 ml-1 h-3" />
                  <div className="flex items-start gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-black mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold text-neutral-400 uppercase">Dropoff</p>
                      <p className="text-xs font-semibold text-neutral-800 line-clamp-1">
                        {ride.dropoff_address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assigned Driver Card (If accepted) */}
                {ride.drivers && (
                  <div className="p-4 rounded-2xl border border-neutral-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-neutral-900 text-white font-bold text-base flex items-center justify-center">
                          {ride.drivers.profiles?.full_name?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 text-sm">
                            {ride.drivers.profiles?.full_name || 'Assigned Driver'}
                          </p>
                          <p className="text-xs text-neutral-500">
                            ★ {ride.drivers.rating || '4.9'} • {ride.drivers.total_rides || 100}+ trips
                          </p>
                        </div>
                      </div>

                      {ride.vehicles && (
                        <div className="text-right">
                          <span className="font-mono text-xs font-bold bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200 block">
                            {ride.vehicles.license_plate}
                          </span>
                          <span className="text-[11px] text-neutral-500 block mt-0.5">
                            {ride.vehicles.color} {ride.vehicles.make} {ride.vehicles.model}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Interactive Demo Simulation Helper (Only in Demo Mode) */}
                {!isCompleted && !isCancelled && (
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        Demo GPS Controller
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Simulate car movement
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSimulateStep}
                      disabled={simulating}
                      className="w-full gap-2 text-xs font-semibold h-10 border-neutral-300 bg-white hover:bg-neutral-100"
                    >
                      {simulating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      Advance Driver Location on Map
                    </Button>
                  </div>
                )}

                {/* Cancel Ride Action */}
                {canCancel && (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-11"
                  >
                    {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Cancel Ride
                  </Button>
                )}

                {/* When Completed: Next Ride Action */}
                {isCompleted && (
                  <Button
                    onClick={() => router.push('/passenger/book')}
                    className="w-full h-12 font-bold"
                  >
                    Book Another Ride
                  </Button>
                )}
              </Card>
            </div>

            {/* Right Column: Live Interactive Tracking Map */}
            <div className="lg:col-span-7 h-full min-h-[400px]">
              <Card className="h-full w-full p-2 rounded-3xl shadow-sm border-neutral-100 overflow-hidden bg-white">
                <InteractiveMap
                  pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng, address: ride.pickup_address }}
                  dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lng, address: ride.dropoff_address }}
                  driverLocation={driverCoord}
                  routePolyline={routeCoordinates}
                  className="h-full w-full"
                />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

