'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: 'free' | 'pro' | 'business' | 'enterprise';
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
};

export type DbUser = {
  id: string;
  clerkUserId: string;
  tenantId: string | null;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  tenant?: Tenant | null;
};

export function useTenant() {
  const { user: clerkUser } = useUser();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clerkUser) {
      setLoading(false);
      return;
    }

    async function fetchUser() {
      try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
          const data = await response.json();
          setDbUser(data);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [clerkUser]);

  return {
    user: dbUser,
    tenant: dbUser?.tenant || null,
    hasTenant: !!dbUser?.tenantId,
    isAdmin: dbUser?.role === 'admin' || dbUser?.role === 'super_admin',
    isSuperAdmin: dbUser?.role === 'super_admin',
    loading,
  };
}
