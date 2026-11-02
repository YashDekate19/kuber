'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Car, Compass, Loader2 } from 'lucide-react';
import { UserRole } from '@/types';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid 10-digit phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>('passenger');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setSubmitting(true);
    const { error } = await signUp(
      data.email,
      data.password,
      data.fullName,
      data.phone,
      selectedRole
    );
    setSubmitting(false);

    if (error) {
      toast.error('Registration Failed', { description: error });
      return;
    }

    toast.success('Account created successfully!');
    if (selectedRole === 'driver') {
      router.push('/driver/dashboard');
    } else {
      router.push('/passenger/book');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center text-white font-black text-xl">
            K
          </div>
          <span className="text-2xl font-bold tracking-tight text-neutral-900">Kuber</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
          Create your Kuber account
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Choose whether you want to ride or drive
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="p-8 shadow-xl border-neutral-100 rounded-3xl">
          {/* Role Selection Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-neutral-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setSelectedRole('passenger')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                selectedRole === 'passenger'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Compass className="h-4 w-4" />
              Passenger
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('driver')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                selectedRole === 'driver'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Car className="h-4 w-4" />
              Driver
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 block">
                Full Name
              </label>
              <Input
                placeholder="John Doe"
                {...register('fullName')}
                className={errors.fullName ? 'border-red-500' : ''}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 block">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 block">
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="9876543210"
                {...register('phone')}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 text-base font-semibold mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                `Register as ${selectedRole === 'driver' ? 'Driver' : 'Passenger'}`
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-neutral-900 underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

