'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically load the Leaflet map on the client side only to prevent SSR "window is not defined" errors
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full min-h-[350px] items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
        <span className="text-xs font-medium">Initializing Map...</span>
      </div>
    </div>
  ),
});

interface InteractiveMapProps {
  pickup?: { lat: number; lng: number; address?: string } | null;
  dropoff?: { lat: number; lng: number; address?: string } | null;
  driverLocation?: { lat: number; lng: number; heading?: number } | null;
  routePolyline?: [number, number][];
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = (props) => {
  return <LeafletMap {...props} />;
};

