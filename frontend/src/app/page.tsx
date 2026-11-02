'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, ShieldCheck, Clock, MapPin, Car, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-neutral-50 to-white py-20 lg:py-32 border-b border-neutral-100">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                Modern Ride-Hailing Platform
              </div>
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-neutral-950 leading-[1.08]">
                Go anywhere with <span className="underline decoration-neutral-300">Kuber</span>.
              </h1>
              <p className="text-lg text-neutral-600 leading-relaxed">
                Request a ride in seconds, track your driver in real-time on our interactive map, and enjoy safe, affordable city travel.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                {user ? (
                  <Link href={role === 'driver' ? '/driver/dashboard' : '/passenger/book'}>
                    <Button size="lg" className="gap-2 text-base">
                      Open Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/passenger/book">
                      <Button size="lg" className="gap-2 text-base">
                        Book a Ride
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button size="lg" variant="outline" className="text-base">
                        Sign up to Drive
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right Card: Quick Action Preview */}
            <div className="flex justify-center">
              <Card className="w-full max-w-md p-8 shadow-2xl border-neutral-100 rounded-3xl space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center text-white">
                      <Car className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900">Request a Ride</h3>
                      <p className="text-xs text-neutral-500">Fast pickup across the city</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Live Drivers
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-neutral-700">
                      MG Road Metro Station
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <div className="h-2.5 w-2.5 rounded-full bg-black" />
                    <span className="text-sm font-medium text-neutral-700">
                      Kempegowda Int'l Airport (BLR)
                    </span>
                  </div>
                </div>

                <Link href="/passenger/book" className="block w-full">
                  <Button className="w-full h-12 text-base font-semibold" size="lg">
                    See Estimated Fares
                  </Button>
                </Link>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-extrabold text-neutral-950">
              Engineered for seamless city transit
            </h2>
            <p className="text-neutral-500">
              Built with Next.js, Flask REST API, Supabase PostgreSQL, and live GPS map tracking.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl border border-neutral-100 bg-neutral-50/50 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Interactive Maps</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Free OpenStreetMap integration with OSRM route calculations, live heading indicators, and waypoint tracking.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-neutral-100 bg-neutral-50/50 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Instant Dispatch</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Algorithmic proximity matching connects passengers with available nearby drivers with zero delays.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-neutral-100 bg-neutral-50/50 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Verified & Secure</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Supabase JWT token authentication with Flask role-based access control and Row Level Security.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-100 py-10 bg-neutral-50 text-neutral-500 text-sm">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-neutral-900 text-lg">Kuber</span>
            <span>© {new Date().getFullYear()} – Ride Booking Web Application</span>
          </div>
          <div className="flex gap-6">
            <Link href="/passenger/book" className="hover:text-neutral-900">Book Ride</Link>
            <Link href="/driver/dashboard" className="hover:text-neutral-900">Driver Portal</Link>
            <Link href="/login" className="hover:text-neutral-900">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

