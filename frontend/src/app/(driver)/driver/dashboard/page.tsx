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
import { Ride, Driver } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Car,
  DollarSign,
  CheckCircle,
  Star,
  Power,
  Navigation,
  ArrowRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

export default function DriverDashboardPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [earnings, setEarnings] = useState<number>(0);
  const [tripsCount, setTripsCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [toggling, setToggling] = useState<boolean>(false);

  const fetchDashboard = async () => {
    const { data, error } = await api.get('/api/driver/dashboard');
    if (data) {
      setDriver(data.driver);
      setActiveRide(data.active_ride);
      setEarnings(data.total_earnings || 0);
      setTripsCount(data.total_completed_trips || 0);
      setIsOnline(Boolean(data.driver?.is_online));
    } else if (error) {
      console.warn('Dashboard fetch error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleOnline = async () => {
    setToggling(true);
    const nextState = !isOnline;
    const { data, error } = await api.post('/api/driver/status', {
      is_online: nextState,
    });
    setToggling(false);

    if (error) {
      toast.error('Failed to update status', { description: error });
    } else {
      setIsOnline(nextState);
      toast.success(nextState ? 'You are now ONLINE and receiving requests.' : 'You are now OFFLINE.');
    }
  };

  return (
    <RoleGuard allowedRole="driver">
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 max-w-5xl space-y-8">
          {/* Header & Online Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-neutral-100 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-neutral-900">Driver Portal</h1>
                <Badge variant={isOnline ? 'emerald' : 'secondary'} className="capitalize px-3 py-1 font-bold">
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {isOnline
                  ? 'You are active on the network and receiving trip dispatches.'
                  : 'Toggle online when you are ready to accept rides.'}
              </p>
            </div>

            <Button
              onClick={handleToggleOnline}
              disabled={toggling}
              size="lg"
              variant={isOnline ? 'default' : 'outline'}
              className={`gap-2 font-bold transition-all ${
                isOnline ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-neutral-300'
              }`}
            >
              {toggling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Power className="h-4 w-4" />
              )}
              {isOnline ? 'Go Offline' : 'Go Online'}
            </Button>
          </div>

          {/* Active Trip Alert (If any) */}
          {activeRide && (
            <Card className="p-6 rounded-3xl border-2 border-black bg-neutral-900 text-white shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <Badge variant="emerald" className="uppercase font-bold text-[10px]">
                    Active Trip: {activeRide.status.replace('_', ' ')}
                  </Badge>
                  <h3 className="text-xl font-bold">
                    Passenger: {activeRide.profiles?.full_name || 'Passenger'}
                  </h3>
                  <p className="text-xs text-neutral-300 line-clamp-1">
                    Destination: {activeRide.dropoff_address}
                  </p>
                </div>
                <Link href={`/driver/active/${activeRide.id}`}>
                  <Button size="lg" className="bg-white text-black hover:bg-neutral-100 font-bold gap-2">
                    Open Navigation & Controls
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Metrics Overview */}
          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="p-6 rounded-3xl border-neutral-100 bg-white space-y-2">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Earnings</span>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-black text-neutral-900">
                {formatCurrency(earnings)}
              </p>
              <p className="text-[11px] text-neutral-400">Completed rides revenue</p>
            </Card>

            <Card className="p-6 rounded-3xl border-neutral-100 bg-white space-y-2">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-bold uppercase tracking-wider">Completed Trips</span>
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-3xl font-black text-neutral-900">{tripsCount}</p>
              <p className="text-[11px] text-neutral-400">Fulfilled passenger rides</p>
            </Card>

            <Card className="p-6 rounded-3xl border-neutral-100 bg-white space-y-2">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-bold uppercase tracking-wider">Driver Rating</span>
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              </div>
              <p className="text-3xl font-black text-neutral-900">
                {driver?.rating ? driver.rating.toFixed(2) : '5.00'}
              </p>
              <p className="text-[11px] text-neutral-400">Top rated driver status</p>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Link href="/driver/requests">
              <Card className="p-6 rounded-3xl border-neutral-100 hover:shadow-lg transition-all group cursor-pointer bg-white">
                <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Navigation className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-1">
                  Available Ride Requests
                </h3>
                <p className="text-xs text-neutral-500 mb-4">
                  Browse and accept incoming passenger ride requests across your city.
                </p>
                <span className="inline-flex items-center text-xs font-bold text-neutral-900 group-hover:underline">
                  Browse dispatches &rarr;
                </span>
              </Card>
            </Link>

            <Link href="/driver/vehicle">
              <Card className="p-6 rounded-3xl border-neutral-100 hover:shadow-lg transition-all group cursor-pointer bg-white">
                <div className="h-12 w-12 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Car className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-1">
                  Vehicle Management
                </h3>
                <p className="text-xs text-neutral-500 mb-4">
                  Update your vehicle model, license plate number, and car category.
                </p>
                <span className="inline-flex items-center text-xs font-bold text-neutral-900 group-hover:underline">
                  Manage vehicle &rarr;
                </span>
              </Card>
            </Link>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}

