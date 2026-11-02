'use client';

import React from 'react';
import { FareTier, VehicleType } from '@/types';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { Users, Car, Shield, Sparkles } from 'lucide-react';

interface VehicleTierSelectorProps {
  tiers: FareTier[];
  selectedType: VehicleType;
  onSelect: (type: VehicleType) => void;
}

export const VehicleTierSelector: React.FC<VehicleTierSelectorProps> = ({
  tiers,
  selectedType,
  onSelect,
}) => {
  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
        Choose a ride
      </h4>
      <div className="space-y-2">
        {tiers.map((tier) => {
          const isSelected = selectedType === tier.vehicle_type;
          return (
            <button
              key={tier.vehicle_type}
              type="button"
              onClick={() => onSelect(tier.vehicle_type)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                isSelected
                  ? 'border-black bg-neutral-50 shadow-sm ring-1 ring-black'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
              }`}
            >
              {/* Left: Icon & Details */}
              <div className="flex items-center gap-4">
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {tier.vehicle_type === 'xl' ? (
                    <Car className="h-6 w-6" />
                  ) : tier.vehicle_type === 'comfort' ? (
                    <Sparkles className="h-6 w-6" />
                  ) : (
                    <Car className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 text-base">
                      {tier.tier_name}
                    </span>
                    <span className="flex items-center text-xs font-medium text-neutral-500 gap-0.5">
                      <Users className="h-3 w-3" />
                      {tier.capacity}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {formatDuration(tier.duration_minutes)} away • Affordable rides
                  </p>
                </div>
              </div>

              {/* Right: Price */}
              <div className="text-right">
                <span className="text-lg font-bold text-neutral-900 block">
                  {formatCurrency(tier.total_fare)}
                </span>
                <span className="text-xs text-neutral-400">Cash / Wallet</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

