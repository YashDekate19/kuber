'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, MapPin, History, User, LogOut, Shield, Compass, DollarSign } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, profile, role, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const isPassenger = role === 'passenger';
  const isDriver = role === 'driver';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-100 bg-white/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-xl bg-black flex items-center justify-center text-white font-black text-xl tracking-tighter transition-transform group-hover:scale-105">
              K
            </div>
            <span className="text-xl font-bold tracking-tight text-neutral-900">
              Kuber
            </span>
          </Link>

          {/* Navigation Links */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {isPassenger ? (
                <>
                  <Link
                    href="/passenger/book"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === '/passenger/book'
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <Compass className="h-4 w-4" />
                    Book Ride
                  </Link>
                  <Link
                    href="/passenger/dashboard"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === '/passenger/dashboard'
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    Live Ride
                  </Link>
                  <Link
                    href="/passenger/history"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === '/passenger/history'
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <History className="h-4 w-4" />
                    Activity
                  </Link>
                </>
              ) : isDriver ? (
                <>
                  <Link
                    href="/driver/dashboard"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === '/driver/dashboard'
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <Car className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link
                    href="/driver/requests"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === '/driver/requests'
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <Compass className="h-4 w-4" />
                    Available Trips
                  </Link>
                  <Link
                    href="/driver/earnings"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === '/driver/earnings'
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <DollarSign className="h-4 w-4" />
                    Earnings
                  </Link>
                  <Link
                    href="/driver/vehicle"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === '/driver/vehicle'
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    Vehicle
                  </Link>
                </>
              ) : null}
            </nav>
          )}
        </div>

        {/* Right Action Section */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Badge variant={isDriver ? 'blue' : 'secondary'} className="capitalize px-3 py-1 font-semibold">
                {role}
              </Badge>

              <span className="hidden sm:inline text-xs font-semibold text-neutral-700">
                {profile?.full_name || user.email?.split('@')[0]}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="gap-1.5 text-neutral-600 hover:text-red-600 hover:border-red-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

