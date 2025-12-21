'use server';

import { db } from '@/lib/db';
import { tenants, users } from '@/lib/db/schema';
import { getCurrentDbUser, syncUserFromClerk } from '@/lib/clerk/utils';
import { slugify } from '@/lib/utils';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth, currentUser as getClerkUser } from '@clerk/nextjs/server';

export async function createTenant(name: string) {
  // Get Clerk user
  const { userId } = await auth();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Sync user from Clerk to DB if not exists
  let currentUser = await getCurrentDbUser();
  if (!currentUser) {
    currentUser = await syncUserFromClerk(userId);
  }

  if (!currentUser) {
    throw new Error('Failed to create user');
  }

  if (currentUser.tenantId) {
    throw new Error('User already belongs to a tenant');
  }

  // Generate unique slug
  let slug = slugify(name);
  let counter = 1;

  while (true) {
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!existing) break;
    slug = `${slugify(name)}-${counter}`;
    counter++;
  }

  // Create tenant
  const [tenant] = await db
    .insert(tenants)
    .values({
      name,
      slug,
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
    })
    .returning();

  // Update user to link to tenant and make them admin
  await db
    .update(users)
    .set({
      tenantId: tenant.id,
      role: 'admin',
      updatedAt: new Date(),
    })
    .where(eq(users.id, currentUser.id));

  revalidatePath('/');

  return tenant;
}

export async function getTenantStats(tenantId: string) {
  const [cabinetCount, userCount, verificationCount] = await Promise.all([
    db.query.cabinets
      .findMany({
        where: (cabinets, { eq }) => eq(cabinets.tenantId, tenantId),
      })
      .then((r) => r.length),
    db.query.users
      .findMany({
        where: (users, { eq }) => eq(users.tenantId, tenantId),
      })
      .then((r) => r.length),
    db.query.verifications
      .findMany({
        where: (verifications, { inArray }) =>
          inArray(
            verifications.cabinetId,
            db.query.cabinets
              .findMany({
                where: (cabinets, { eq }) => eq(cabinets.tenantId, tenantId),
                columns: { id: true },
              })
              .then((r) => r.map((c) => c.id))
          ),
      })
      .then((r) => r.length),
  ]);

  return {
    cabinetCount,
    userCount,
    verificationCount,
  };
}

export async function updateTenant(
  tenantId: string,
  data: { name?: string }
) {
  const currentUser = await getCurrentDbUser();

  if (!currentUser) {
    throw new Error('User not authenticated');
  }

  if (currentUser.tenantId !== tenantId) {
    throw new Error('Unauthorized');
  }

  if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
    throw new Error('Only admins can update tenant information');
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (data.name) {
    updateData.name = data.name;
  }

  const [tenant] = await db
    .update(tenants)
    .set(updateData)
    .where(eq(tenants.id, tenantId))
    .returning();

  revalidatePath('/dashboard/settings');

  return tenant;
}
