'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { Ride } from '@/types';
import { formatCurrency, formatDistance, formatDuration, formatTimestamp } from '@/lib/utils';
import { MapPin, ArrowRight, Loader2, Compass, AlertCircle, RefreshCw } from 'lucide-react';

export default function AvailableRequestsPage() {
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchAvailable = async () => {
    const { data, error } = await api.get<Ride[]>('/api/driver/rides/available');
    if (data && Array.isArray(data)) {
      setRides(data);
    } else if (error) {
      console.warn('Available rides error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAvailable();
    const interval = setInterval(fetchAvailable, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptRide = async (rideId: string) => {
    setAcceptingId(rideId);
    const { data, error } = await api.post(`/api/driver/rides/${rideId}/accept`);
    setAcceptingId(null);

    if (error) {
      toast.error('Could not accept ride', { description: error });
      fetchAvailable();
      return;
    }

    toast.success('Ride accepted! Redirecting to navigation...');
    router.push(`/driver/active/${rideId}`);
  };

  return (
    <RoleGuard allowedRole="driver">
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-neutral-950">
                Available Ride Requests
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Real-time passenger requests waiting for driver assignment.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchAvailable();
              }}
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="py-20 text-center text-neutral-400 text-sm">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-black" />
              Scanning for passenger requests...
            </div>
          ) : rides.length === 0 ? (
            <Card className="p-12 text-center rounded-3xl border-neutral-100 bg-white space-y-3">
              <Compass className="h-10 w-10 text-neutral-300 mx-auto" />
              <h3 className="text-base font-bold text-neutral-900">No Pending Requests</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Make sure you are toggled <strong className="text-neutral-800">ONLINE</strong> on your dashboard. When passengers request rides in your area, they will appear here instantly.
              </p>
              <Link href="/driver/dashboard" className="inline-block mt-2">
                <Button size="sm" variant="outline">Back to Dashboard</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {rides.map((ride) => (
                <Card key={ride.id} className="p-6 rounded-3xl border-neutral-100 shadow-sm bg-white space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="blue" className="text-xs uppercase font-bold">
                        {ride.vehicle_type}
                      </Badge>
                      <span className="text-xs text-neutral-400">
                        Requested {formatTimestamp(ride.created_at)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-neutral-900 block">
                        {formatCurrency(ride.fare_amount)}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {formatDistance(ride.distance_km)} • ~{formatDuration(ride.estimated_duration_mins)}
                      </span>
                    </div>
                  </div>

                  {/* Route points */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                      <div>
                        <span className="text-neutral-400 block text-[10px] uppercase font-bold">Pickup Spot</span>
                        <span className="font-semibold text-neutral-800">{ride.pickup_address}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-black mt-1 flex-shrink-0" />
                      <div>
                        <span className="text-neutral-400 block text-[10px] uppercase font-bold">Destination</span>
                        <span className="font-semibold text-neutral-800">{ride.dropoff_address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Passenger & Accept */}
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
                    <div className="text-xs text-neutral-600">
                      Passenger: <strong className="text-neutral-900">{ride.profiles?.full_name || 'Passenger'}</strong>
                    </div>

                    <Button
                      onClick={() => handleAcceptRide(ride.id)}
                      disabled={acceptingId === ride.id}
                      className="bg-black hover:bg-neutral-800 text-white font-bold gap-2 rounded-xl"
                    >
                      {acceptingId === ride.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          Accept Trip
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}

