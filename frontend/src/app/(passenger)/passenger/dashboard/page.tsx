'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/apiClient';
import { Ride } from '@/types';
import { formatCurrency, formatTimestamp } from '@/lib/utils';
import { Compass, Clock, MapPin, ArrowRight, ShieldCheck, Car } from 'lucide-react';

export default function PassengerDashboardPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [recentRides, setRecentRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active ride
    api.get<Ride>('/api/passenger/rides/active').then(({ data }) => {
      if (data) setActiveRide(data);
    });

    // Check history
    api.get<Ride[]>('/api/passenger/rides/history').then(({ data }) => {
      if (data && Array.isArray(data)) {
        setRecentRides(data.slice(0, 5));
      }
      setLoading(false);
    });
  }, []);

  return (
    <RoleGuard allowedRole="passenger">
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 max-w-5xl space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-neutral-950">
                Welcome, {profile?.full_name || user?.email?.split('@')[0]}
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Manage your trips and book your next ride.
              </p>
            </div>
            <Link href="/passenger/book">
              <Button size="lg" className="gap-2 font-bold shadow-md">
                <Compass className="h-4 w-4" />
                Book a Ride Now
              </Button>
            </Link>
          </div>

          {/* Active Ride Banner (If exists) */}
          {activeRide && (
            <Card className="p-6 rounded-3xl border-2 border-emerald-500 bg-emerald-50/30 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="emerald" className="uppercase text-xs font-bold px-3 py-1">
                      Live Trip: {activeRide.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-neutral-500">
                      Booked {formatTimestamp(activeRide.created_at)}
                    </span>
                  </div>
                  <p className="font-bold text-neutral-900 text-base">
                    Destination: {activeRide.dropoff_address}
                  </p>
                </div>
                <Link href={`/passenger/track/${activeRide.id}`}>
                  <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    View Live Tracker
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Quick Actions Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Link href="/passenger/book">
              <Card className="p-6 rounded-3xl border-neutral-100 hover:shadow-lg transition-all group cursor-pointer bg-white">
                <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Car className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-1">Book a Ride</h3>
                <p className="text-xs text-neutral-500 mb-4">
                  Set pickup & dropoff on our interactive live map and pick from Kuber Go, Comfort, or XL.
                </p>
                <span className="inline-flex items-center text-xs font-bold text-neutral-900 group-hover:underline">
                  Start booking &rarr;
                </span>
              </Card>
            </Link>

            <Link href="/passenger/history">
              <Card className="p-6 rounded-3xl border-neutral-100 hover:shadow-lg transition-all group cursor-pointer bg-white">
                <div className="h-12 w-12 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-1">Ride History</h3>
                <p className="text-xs text-neutral-500 mb-4">
                  View your completed past trips, fare receipts, and driver ratings.
                </p>
                <span className="inline-flex items-center text-xs font-bold text-neutral-900 group-hover:underline">
                  View past activity &rarr;
                </span>
              </Card>
            </Link>
          </div>

          {/* Recent Trips Preview */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">
              Recent Activity
            </h2>

            {loading ? (
              <div className="py-8 text-center text-neutral-400 text-sm">Loading activity...</div>
            ) : recentRides.length === 0 ? (
              <Card className="p-8 text-center rounded-3xl border-neutral-100 text-neutral-500">
                <p className="text-sm">You have not taken any rides yet.</p>
                <Link href="/passenger/book" className="inline-block mt-3">
                  <Button size="sm">Book Your First Ride</Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentRides.map((trip) => (
                  <Card key={trip.id} className="p-4 rounded-2xl border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900 line-clamp-1">
                          {trip.dropoff_address}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatTimestamp(trip.created_at)} • {trip.vehicle_type.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-neutral-900 block">
                        {formatCurrency(trip.fare_amount)}
                      </span>
                      <Badge variant={trip.status === 'completed' ? 'emerald' : 'secondary'} className="text-[10px] uppercase">
                        {trip.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}

