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
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Car, Loader2, Sparkles, UserCheck } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signIn, role } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setSubmitting(true);
    const { error } = await signIn(data.email, data.password);
    setSubmitting(false);

    if (error) {
      toast.error('Login Failed', { description: error });
      return;
    }

    toast.success('Welcome back!');
    // Redirect based on role or default to passenger
    router.push('/passenger/book');
  };

  // Quick demo filler
  const fillDemoAccount = (demoRole: 'passenger' | 'driver') => {
    const demoEmail = demoRole === 'driver' ? 'driver.test@kuber.local' : 'passenger.test@kuber.local';
    const demoPass = 'Password123!';
    setValue('email', demoEmail);
    setValue('password', demoPass);
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
          Sign in to your account
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Access your passenger bookings or driver portal
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="p-8 shadow-xl border-neutral-100 rounded-3xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-6 pt-6 border-t border-neutral-100">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 text-center">
              One-Click Demo Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemoAccount('passenger')}
                className="text-xs gap-1.5 justify-center py-2"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Demo Passenger
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemoAccount('driver')}
                className="text-xs gap-1.5 justify-center py-2"
              >
                <Car className="h-3.5 w-3.5" />
                Demo Driver
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-neutral-500">
            Don't have an account yet?{' '}
            <Link href="/register" className="font-semibold text-neutral-900 underline underline-offset-4">
              Sign up
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

