'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { InteractiveMap } from '@/components/map/InteractiveMap';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { Ride, RideStatus } from '@/types';
import { formatCurrency, formatDistance, formatDuration } from '@/lib/utils';
import {
  Car,
  User,
  Phone,
  CheckCircle2,
  Navigation,
  ArrowRight,
  Loader2,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

export default function DriverActiveTripPage() {
  const params = useParams();
  const router = useRouter();
  const rideId = params?.id as string;

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [driverCoord, setDriverCoord] = useState<{ lat: number; lng: number } | null>(null);

  const fetchRide = async () => {
    if (!rideId) return;
    const { data, error } = await api.get<Ride>(`/api/rides/${rideId}`);
    if (data) {
      setRide(data);
      // Initialize driver coord near pickup
      if (!driverCoord) {
        setDriverCoord({
          lat: data.pickup_lat + 0.005,
          lng: data.pickup_lng + 0.005,
        });
      }
    } else if (error) {
      console.error('Error fetching ride:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRide();
    const interval = setInterval(fetchRide, 3000);
    return () => clearInterval(interval);
  }, [rideId]);

  // Route calculation
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

  // Status transitions
  const handleTransition = async (nextStatus: RideStatus) => {
    setUpdatingStatus(true);
    const { data, error } = await api.post(`/api/rides/${rideId}/status`, {
      status: nextStatus,
    });
    setUpdatingStatus(false);

    if (error) {
      toast.error('State Update Failed', { description: error });
    } else {
      toast.success(`Trip status updated: ${nextStatus.replace('_', ' ')}`);
      fetchRide();
    }
  };

  if (loading) {
    return (
      <RoleGuard allowedRole="driver">
        <div className="flex h-screen w-full items-center justify-center bg-neutral-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-black" />
            <p className="text-sm font-medium text-neutral-500">Loading trip details...</p>
          </div>
        </div>
      </RoleGuard>
    );
  }

  if (!ride) {
    return (
      <RoleGuard allowedRole="driver">
        <div className="min-h-screen bg-neutral-50 flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
            <Card className="p-8 text-center max-w-md">
              <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold">Ride Not Found</h3>
              <p className="text-xs text-neutral-500 mb-4">This trip may have been cancelled or completed.</p>
              <Button onClick={() => router.push('/driver/dashboard')}>Back to Dashboard</Button>
            </Card>
          </div>
        </div>
      </RoleGuard>
    );
  }

  const isCompleted = ride.status === 'completed';

  return (
    <RoleGuard allowedRole="driver">
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navbar />

        <div className="flex-1 container mx-auto px-4 sm:px-6 py-6">
          <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)] min-h-[650px]">
            {/* Left Column: Driver Controls & Navigation */}
            <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
              <Card className="p-6 rounded-3xl shadow-sm border-neutral-100 bg-white space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <Badge variant="blue" className="px-3 py-1 uppercase text-xs font-bold">
                    Status: {ride.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-lg font-black text-neutral-900">
                    {formatCurrency(ride.fare_amount)}
                  </span>
                </div>

                {/* Passenger Info */}
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-black text-white flex items-center justify-center font-bold text-lg">
                      {ride.profiles?.full_name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400 font-semibold uppercase">Passenger</p>
                      <p className="font-bold text-neutral-900 text-sm">
                        {ride.profiles?.full_name || 'Passenger'}
                      </p>
                    </div>
                  </div>
                  {ride.profiles?.phone && (
                    <a
                      href={`tel:${ride.profiles.phone}`}
                      className="h-10 w-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-100"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Route Waypoints */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">Pickup Location</span>
                      <p className="font-semibold text-neutral-900">{ride.pickup_address}</p>
                    </div>
                  </div>
                  <div className="border-l border-dashed border-neutral-300 ml-1 h-3" />
                  <div className="flex items-start gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-black mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">Dropoff Destination</span>
                      <p className="font-semibold text-neutral-900">{ride.dropoff_address}</p>
                    </div>
                  </div>
                </div>

                {/* Driver Action Transition Buttons */}
                <div className="pt-2">
                  {ride.status === 'accepted' && (
                    <Button
                      onClick={() => handleTransition('driver_arriving')}
                      disabled={updatingStatus}
                      className="w-full h-14 text-base font-bold rounded-2xl bg-black hover:bg-neutral-800 gap-2"
                    >
                      {updatingStatus ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
                      Mark Arrived at Pickup
                    </Button>
                  )}

                  {ride.status === 'driver_arriving' && (
                    <Button
                      onClick={() => handleTransition('in_progress')}
                      disabled={updatingStatus}
                      className="w-full h-14 text-base font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg"
                    >
                      {updatingStatus ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                      Start Trip (Passenger Onboard)
                    </Button>
                  )}

                  {ride.status === 'in_progress' && (
                    <Button
                      onClick={() => handleTransition('completed')}
                      disabled={updatingStatus}
                      className="w-full h-14 text-base font-bold rounded-2xl bg-black hover:bg-neutral-800 text-white gap-2 shadow-lg"
                    >
                      {updatingStatus ? <Loader2 className="h-5 w-5 animate-spin" /> : <DollarSign className="h-5 w-5" />}
                      Complete Trip & Collect Fare
                    </Button>
                  )}

                  {isCompleted && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-1" />
                        <h4 className="font-bold text-emerald-950">Trip Completed!</h4>
                        <p className="text-xs text-emerald-700">
                          Cash Collected: <strong>{formatCurrency(ride.fare_amount)}</strong>
                        </p>
                      </div>
                      <Button
                        onClick={() => router.push('/driver/dashboard')}
                        className="w-full h-12 font-bold"
                      >
                        Return to Dashboard
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column: Interactive Map */}
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

