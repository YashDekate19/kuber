'use client';

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default marker icons in Next.js bundler
const createCustomIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background: ${color};
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 2px solid white;
        font-weight: bold;
        font-size: 13px;
      ">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createCarIcon = (heading: number = 0) => {
  return L.divIcon({
    className: 'custom-car-marker',
    html: `
      <div style="
        background: #000000;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        border: 2px solid #10b981;
        transform: rotate(${heading}deg);
        transition: transform 0.3s ease-out;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.9 2 11.4 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

interface MapProps {
  pickup?: { lat: number; lng: number; address?: string } | null;
  dropoff?: { lat: number; lng: number; address?: string } | null;
  driverLocation?: { lat: number; lng: number; heading?: number } | null;
  routePolyline?: [number, number][];
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

// Auto-adjust zoom/bounds to fit all active markers
function MapAutoBounds({
  pickup,
  dropoff,
  driverLocation,
}: {
  pickup?: { lat: number; lng: number } | null;
  dropoff?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];
    if (pickup) points.push([pickup.lat, pickup.lng]);
    if (dropoff) points.push([dropoff.lat, dropoff.lng]);
    if (driverLocation) points.push([driverLocation.lat, driverLocation.lng]);

    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [60, 60], animate: true });
    }
  }, [pickup, dropoff, driverLocation, map]);

  return null;
}

export default function LeafletMap({
  pickup,
  dropoff,
  driverLocation,
  routePolyline,
  className,
}: MapProps) {
  // Default fallback center: Bangalore city center
  const defaultCenter: [number, number] = [12.9716, 77.5946];
  const center = useMemo<[number, number]>(() => {
    if (pickup) return [pickup.lat, pickup.lng];
    if (dropoff) return [dropoff.lat, dropoff.lng];
    if (driverLocation) return [driverLocation.lat, driverLocation.lng];
    return defaultCenter;
  }, [pickup, dropoff, driverLocation]);

  const pickupIcon = useMemo(() => createCustomIcon('#10b981', 'P'), []);
  const dropoffIcon = useMemo(() => createCustomIcon('#000000', 'D'), []);
  const carIcon = useMemo(
    () => createCarIcon(driverLocation?.heading || 0),
    [driverLocation?.heading]
  );

  return (
    <div className={`relative w-full h-full min-h-[350px] overflow-hidden rounded-2xl ${className || ''}`}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Sleek, high-contrast monochrome CartoDB Positron tiles for an Uber-like aesthetic */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapAutoBounds pickup={pickup} dropoff={dropoff} driverLocation={driverLocation} />

        {/* Pickup Marker */}
        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>
              <div className="font-sans text-xs">
                <span className="font-bold text-emerald-600 block">Pickup Location</span>
                {pickup.address || `${pickup.lat}, ${pickup.lng}`}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dropoff Marker */}
        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
            <Popup>
              <div className="font-sans text-xs">
                <span className="font-bold text-neutral-900 block">Destination</span>
                {dropoff.address || `${dropoff.lat}, ${dropoff.lng}`}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Driver Car Marker */}
        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={carIcon}
          >
            <Popup>
              <div className="font-sans text-xs font-semibold">
                Driver Location
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline */}
        {routePolyline && routePolyline.length > 0 && (
          <Polyline
            positions={routePolyline}
            color="#000000"
            weight={4}
            opacity={0.85}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapContainer>
    </div>
  );
}

