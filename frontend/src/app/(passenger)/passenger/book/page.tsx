'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { LocationInput } from '@/components/passenger/LocationInput';
import { VehicleTierSelector } from '@/components/passenger/VehicleTierSelector';
import { InteractiveMap } from '@/components/map/InteractiveMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { FareEstimateResponse, VehicleType } from '@/types';
import { formatCurrency, formatDistance, formatDuration } from '@/lib/utils';
import { Loader2, ArrowRight, ShieldCheck, Sparkles, Navigation } from 'lucide-react';

export default function BookRidePage() {
  const router = useRouter();

  // Locations state (defaults to vibrant central hub in Bangalore for instant demo readiness)
  const [pickup, setPickup] = useState<{ lat: number; lng: number; address: string }>({
    lat: 12.9756,
    lng: 77.6066,
    address: 'MG Road Metro Station, Bangalore',
  });

  const [dropoff, setDropoff] = useState<{ lat: number; lng: number; address: string }>({
    lat: 12.9345,
    lng: 77.6265,
    address: 'Koramangala Sony World Signal, Bangalore',
  });

  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [estimates, setEstimates] = useState<FareEstimateResponse | null>(null);
  const [selectedType, setSelectedType] = useState<VehicleType>('standard');
  const [calculating, setCalculating] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [autoAssignDemo, setAutoAssignDemo] = useState(true);

  // Fetch fare estimates and route polyline when coordinates change
  useEffect(() => {
    if (!pickup.lat || !dropoff.lat) return;

    let isMounted = true;
    setCalculating(true);

    // 1. Calculate fare estimates via Flask backend
    api.post<FareEstimateResponse>('/api/passenger/rides/estimate', {
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      dropoff_lat: dropoff.lat,
      dropoff_lng: dropoff.lng,
    }).then(({ data, error }) => {
      if (isMounted) {
        if (data && data.tiers) {
          setEstimates(data);
        } else if (error) {
          console.warn('Fare estimate error:', error);
        }
      }
    });

    // 2. Fetch road route polyline from location service
    api.post<{ coordinates: [number, number][]; distance_km: number }>('/api/location/route', {
      start_lat: pickup.lat,
      start_lng: pickup.lng,
      end_lat: dropoff.lat,
      end_lng: dropoff.lng,
    }).then(({ data }) => {
      if (isMounted) {
        if (data && data.coordinates) {
          setRouteCoordinates(data.coordinates);
        }
        setCalculating(false);
      }
    }).catch(() => {
      if (isMounted) setCalculating(false);
    });

    return () => {
      isMounted = false;
    };
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  const handleRequestRide = async () => {
    if (!pickup.address || !dropoff.address) {
      toast.error('Please enter both pickup and destination locations.');
      return;
    }

    setRequesting(true);
    const { data, error } = await api.post('/api/passenger/rides/request', {
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      pickup_address: pickup.address,
      dropoff_lat: dropoff.lat,
      dropoff_lng: dropoff.lng,
      dropoff_address: dropoff.address,
      vehicle_type: selectedType,
      auto_assign_demo: autoAssignDemo,
    });
    setRequesting(false);

    if (error) {
      toast.error('Could not request ride', { description: error });
      return;
    }

    if (data && data.id) {
      toast.success('Ride requested successfully!');
      router.push(`/passenger/track/${data.id}`);
    }
  };

  const selectedTier = estimates?.tiers.find((t) => t.vehicle_type === selectedType);

  return (
    <RoleGuard allowedRole="passenger">
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navbar />

        <div className="flex-1 container mx-auto px-4 sm:px-6 py-6">
          <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)] min-h-[650px]">
            {/* Left Column: Booking Form Console */}
            <div className="lg:col-span-5 flex flex-col gap-5 overflow-y-auto pr-1">
              <Card className="p-6 rounded-3xl shadow-sm border-neutral-100 bg-white space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                    Where to?
                  </h2>
                  {estimates && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-full">
                      <Navigation className="h-3.5 w-3.5 text-neutral-700" />
                      <span>{formatDistance(estimates.distance_km)}</span>
                      <span>•</span>
                      <span>{formatDuration(estimates.duration_minutes)}</span>
                    </div>
                  )}
                </div>

                {/* Pickup & Destination Inputs */}
                <div className="space-y-4">
                  <LocationInput
                    label="Pickup Location"
                    placeholder="Enter pickup spot or landmark..."
                    value={pickup.address}
                    dotColor="bg-emerald-500"
                    onChange={(addr, coords) => {
                      setPickup((prev) => ({
                        address: addr,
                        lat: coords ? coords.lat : prev.lat,
                        lng: coords ? coords.lng : prev.lng,
                      }));
                    }}
                  />

                  <LocationInput
                    label="Destination"
                    placeholder="Enter destination..."
                    value={dropoff.address}
                    dotColor="bg-black"
                    onChange={(addr, coords) => {
                      setDropoff((prev) => ({
                        address: addr,
                        lat: coords ? coords.lat : prev.lat,
                        lng: coords ? coords.lng : prev.lng,
                      }));
                    }}
                  />
                </div>

                {/* Vehicle Tier Selection */}
                {calculating ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-neutral-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Calculating best routes & fares...</span>
                  </div>
                ) : estimates ? (
                  <VehicleTierSelector
                    tiers={estimates.tiers}
                    selectedType={selectedType}
                    onSelect={(type) => setSelectedType(type)}
                  />
                ) : null}

                {/* Demo Helper Switch */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-neutral-900">Auto-match Demo Driver</p>
                      <p className="text-[11px] text-neutral-500">Instantly accepts for testing without a second device</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoAssignDemo}
                    onChange={(e) => setAutoAssignDemo(e.target.checked)}
                    className="h-4 w-4 rounded text-black focus:ring-black cursor-pointer"
                  />
                </div>

                {/* Submit Booking Button */}
                <Button
                  onClick={handleRequestRide}
                  disabled={requesting || calculating}
                  size="lg"
                  className="w-full h-14 text-base font-bold rounded-2xl gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  {requesting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Requesting Ride...
                    </>
                  ) : (
                    <>
                      Request {selectedTier?.tier_name || 'Kuber Ride'}
                      {selectedTier && ` • ${formatCurrency(selectedTier.total_fare)}`}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </Card>
            </div>

            {/* Right Column: Interactive Map */}
            <div className="lg:col-span-7 h-full min-h-[400px]">
              <Card className="h-full w-full p-2 rounded-3xl shadow-sm border-neutral-100 overflow-hidden bg-white">
                <InteractiveMap
                  pickup={pickup}
                  dropoff={dropoff}
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

