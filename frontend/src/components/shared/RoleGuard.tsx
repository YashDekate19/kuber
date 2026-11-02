'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRole?: UserRole;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRole }) => {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (allowedRole && role !== allowedRole) {
        // Redirect to their appropriate home
        if (role === 'driver') {
          router.push('/driver/dashboard');
        } else {
          router.push('/passenger/book');
        }
      }
    }
  }, [user, role, loading, allowedRole, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="text-sm font-medium text-neutral-500">Loading Kuber...</p>
        </div>
      </div>
    );
  }

  if (allowedRole && role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
};

