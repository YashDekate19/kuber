'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/apiClient';
import { Ride } from '@/types';
import { formatCurrency, formatTimestamp, formatDistance } from '@/lib/utils';
import { MapPin, Calendar, Car, ArrowRight, Compass } from 'lucide-react';

export default function RideHistoryPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    api.get<Ride[]>('/api/passenger/rides/history').then(({ data }) => {
      if (data && Array.isArray(data)) {
        setRides(data);
      }
      setLoading(false);
    });
  }, []);

  const filteredRides = rides.filter((r) => {
    if (filter === 'completed') return r.status === 'completed';
    if (filter === 'cancelled') return r.status === 'cancelled';
    return true;
  });

  return (
    <RoleGuard allowedRole="passenger">
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-neutral-950">
                Your Past Activity
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Review your completed trips and past receipts.
              </p>
            </div>
            <Link href="/passenger/book">
              <Button className="gap-2 font-bold">
                <Compass className="h-4 w-4" />
                Book Ride
              </Button>
            </Link>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2">
            {(['all', 'completed', 'cancelled'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                  filter === tab
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="py-16 text-center text-neutral-400 text-sm">
              Loading trip history...
            </div>
          ) : filteredRides.length === 0 ? (
            <Card className="p-12 text-center rounded-3xl border-neutral-100 text-neutral-500">
              <Car className="h-10 w-10 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm">No trips found matching this filter.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRides.map((ride) => (
                <Card key={ride.id} className="p-6 rounded-3xl border-neutral-100 shadow-sm space-y-4 bg-white">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatTimestamp(ride.created_at)}</span>
                      <span>•</span>
                      <span className="font-semibold uppercase text-neutral-700">
                        {ride.vehicle_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-neutral-900">
                        {formatCurrency(ride.fare_amount)}
                      </span>
                      <Badge
                        variant={ride.status === 'completed' ? 'emerald' : 'secondary'}
                        className="text-[10px] uppercase font-bold"
                      >
                        {ride.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Route points */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="text-neutral-500">From:</span>
                      <span className="font-medium text-neutral-800 line-clamp-1">{ride.pickup_address}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-black flex-shrink-0" />
                      <span className="text-neutral-500">To:</span>
                      <span className="font-medium text-neutral-800 line-clamp-1">{ride.dropoff_address}</span>
                    </div>
                  </div>

                  {/* Footer details */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-50 text-xs text-neutral-500">
                    <div>
                      {ride.drivers?.profiles?.full_name ? (
                        <span>Driver: <strong className="text-neutral-800">{ride.drivers.profiles.full_name}</strong> ({ride.vehicles?.license_plate})</span>
                      ) : (
                        <span>Simulated / Auto-dispatched</span>
                      )}
                    </div>
                    <Link href={`/passenger/track/${ride.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                        View Trip <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
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

