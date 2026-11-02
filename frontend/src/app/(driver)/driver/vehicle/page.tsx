'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/shared/Navbar';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { Vehicle } from '@/types';
import { Car, ShieldCheck, Loader2 } from 'lucide-react';

export default function DriverVehiclePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [make, setMake] = useState('Maruti Suzuki');
  const [model, setModel] = useState('Dzire');
  const [year, setYear] = useState('2023');
  const [color, setColor] = useState('Silver');
  const [plate, setPlate] = useState('KA 01 AB 1234');
  const [type, setType] = useState<'standard' | 'comfort' | 'xl'>('standard');

  const fetchVehicle = async () => {
    const { data } = await api.get<Vehicle[]>('/api/driver/vehicle');
    if (data && Array.isArray(data) && data.length > 0) {
      setVehicles(data);
      const active = data[0];
      setMake(active.make);
      setModel(active.model);
      setYear(String(active.year));
      setColor(active.color);
      setPlate(active.license_plate);
      setType(active.vehicle_type);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicle();
  }, []);

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await api.post('/api/driver/vehicle', {
      make,
      model,
      year: parseInt(year),
      color,
      license_plate: plate,
      vehicle_type: type,
    });
    setSaving(false);

    if (error) {
      toast.error('Failed to save vehicle', { description: error });
    } else {
      toast.success('Vehicle registered and active!');
      fetchVehicle();
    }
  };

  return (
    <RoleGuard allowedRole="driver">
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 max-w-2xl space-y-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">
              Vehicle Registration
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Your registered vehicle information displayed to passengers.
            </p>
          </div>

          <Card className="p-8 rounded-3xl border-neutral-100 bg-white shadow-sm">
            <form onSubmit={handleSaveVehicle} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 block">
                    Make
                  </label>
                  <Input
                    placeholder="e.g. Toyota"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 block">
                    Model
                  </label>
                  <Input
                    placeholder="e.g. Innova"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 block">
                    Year
                  </label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 block">
                    Color
                  </label>
                  <Input
                    placeholder="e.g. White"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 block">
                  License Plate Number
                </label>
                <Input
                  placeholder="KA 01 AB 1234"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  className="font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 block">
                  Vehicle Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['standard', 'comfort', 'xl'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setType(cat)}
                      className={`py-3 rounded-xl border text-xs font-bold uppercase transition-all ${
                        type === cat
                          ? 'border-black bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full h-12 text-base font-bold rounded-xl mt-4"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Details...
                  </>
                ) : (
                  'Save Vehicle Details'
                )}
              </Button>
            </form>
          </Card>
        </main>
      </div>
    </RoleGuard>
  );
}

