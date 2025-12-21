import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get the current user from the database
 */
export async function getCurrentDbUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
    with: {
      tenant: true,
    },
  });

  return user;
}

/**
 * Get or create user in database from Clerk user
 */
export async function getOrCreateDbUser(clerkUserId: string, email: string) {
  // Check if user exists
  let user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  // Create user if not exists
  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({
        clerkUserId,
        email,
        role: 'user',
      })
      .returning();

    user = newUser;
  }

  return user;
}

/**
 * Check if user has a specific role
 */
export async function hasRole(role: 'super_admin' | 'admin' | 'user') {
  const user = await getCurrentDbUser();
  if (!user) return false;
  return user.role === role;
}

/**
 * Check if user is admin or super_admin
 */
export async function isAdmin() {
  const user = await getCurrentDbUser();
  if (!user) return false;
  return user.role === 'admin' || user.role === 'super_admin';
}

/**
 * Check if user is super_admin
 */
export async function isSuperAdmin() {
  const user = await getCurrentDbUser();
  if (!user) return false;
  return user.role === 'super_admin';
}

/**
 * Update user role in Clerk metadata
 */
export async function updateClerkUserRole(
  userId: string,
  role: 'super_admin' | 'admin' | 'user'
) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      role,
    },
  });
}

/**
 * Sync user from Clerk to database
 */
export async function syncUserFromClerk(clerkUserId: string) {
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress || '';

  // Get or create user
  let user = await getOrCreateDbUser(clerkUserId, email);

  // Update email if changed
  if (user.email !== email) {
    [user] = await db
      .update(users)
      .set({ email, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
  }

  // Re-fetch with tenant relation
  const userWithTenant = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    with: {
      tenant: true,
    },
  });

  return userWithTenant;
}

/**
 * Get user's tenant
 */
export async function getUserTenant() {
  const user = await getCurrentDbUser();
  if (!user || !user.tenantId) return null;

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, user.tenantId),
  });

  return tenant;
}

/**
 * Check if user belongs to a tenant
 */
export async function hasTenant() {
  const user = await getCurrentDbUser();
  return !!user?.tenantId;
}
