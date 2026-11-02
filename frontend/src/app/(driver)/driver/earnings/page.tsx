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
import { DollarSign, CheckCircle2, TrendingUp, Calendar, ArrowLeft } from 'lucide-react';

export default function DriverEarningsPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.get('/api/driver/dashboard').then(({ data }) => {
      if (data) {
        setTotalEarnings(data.total_earnings || 0);
      }
    });

    api.get<Ride[]>('/api/passenger/rides/history').then(({ data }) => {
      if (data && Array.isArray(data)) {
        setRides(data.filter((r) => r.status === 'completed'));
      }
      setLoading(false);
    });
  }, []);

  return (
    <RoleGuard allowedRole="driver">
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-neutral-950">
                Driver Earnings
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Your accumulated fare payments and trip settlements.
              </p>
            </div>
            <Link href="/driver/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </div>

          {/* Earnings Highlight Cards */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="p-6 rounded-3xl border-neutral-100 bg-white space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-4xl font-black text-neutral-950">
                {formatCurrency(totalEarnings)}
              </p>
              <p className="text-xs text-neutral-400">Total fares collected</p>
            </Card>

            <Card className="p-6 rounded-3xl border-neutral-100 bg-white space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-bold uppercase tracking-wider">Settlement Status</span>
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-4xl font-black text-neutral-950">100%</p>
              <p className="text-xs text-neutral-400">Direct cash & digital wallet receipts</p>
            </Card>
          </div>

          {/* Fulfilled Trips List */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">
              Completed Trip Records
            </h2>

            {loading ? (
              <div className="py-12 text-center text-neutral-400 text-sm">
                Loading earnings records...
              </div>
            ) : rides.length === 0 ? (
              <Card className="p-12 text-center rounded-3xl border-neutral-100 text-neutral-500">
                <TrendingUp className="h-10 w-10 mx-auto text-neutral-300 mb-2" />
                <p className="text-sm">No completed rides yet.</p>
                <Link href="/driver/requests" className="inline-block mt-3">
                  <Button size="sm">Accept Available Requests</Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-3">
                {rides.map((ride) => (
                  <Card key={ride.id} className="p-4 rounded-2xl border-neutral-100 bg-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-neutral-900">
                          {ride.dropoff_address.split(',')[0]}
                        </span>
                        <Badge variant="emerald" className="text-[10px] uppercase">
                          Paid
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-500">
                        {formatTimestamp(ride.created_at)} • {formatDistance(ride.distance_km)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-neutral-900 block">
                        +{formatCurrency(ride.fare_amount)}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        Cash Settlement
                      </span>
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

