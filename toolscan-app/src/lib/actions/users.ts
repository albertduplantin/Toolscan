'use server';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentDbUser, isAdmin } from '@/lib/clerk/utils';
import { revalidatePath } from 'next/cache';
import { clerkClient } from '@clerk/nextjs/server';

export async function updateUserRole(userId: string, newRole: 'user' | 'admin') {
  const currentUser = await getCurrentDbUser();
  const userIsAdmin = await isAdmin();

  if (!currentUser || !userIsAdmin) {
    throw new Error('Unauthorized');
  }

  if (!currentUser.tenantId) {
    throw new Error('No tenant found');
  }

  // Prevent changing own role
  if (userId === currentUser.id) {
    throw new Error('Vous ne pouvez pas modifier votre propre rôle');
  }

  // Get the user to update
  const userToUpdate = await db.query.users.findFirst({
    where: and(eq(users.id, userId), eq(users.tenantId, currentUser.tenantId)),
  });

  if (!userToUpdate) {
    throw new Error('User not found');
  }

  // Prevent changing super_admin role
  if (userToUpdate.role === 'super_admin') {
    throw new Error('Impossible de modifier le rôle d\'un super admin');
  }

  // Update in database
  await db
    .update(users)
    .set({ role: newRole })
    .where(eq(users.id, userId));

  // Update in Clerk metadata
  const client = await clerkClient();
  await client.users.updateUserMetadata(userToUpdate.clerkUserId, {
    publicMetadata: {
      role: newRole,
    },
  });

  revalidatePath('/dashboard/settings/team');
}

export async function deleteUser(userId: string) {
  const currentUser = await getCurrentDbUser();
  const userIsAdmin = await isAdmin();

  if (!currentUser || !userIsAdmin) {
    throw new Error('Unauthorized');
  }

  if (!currentUser.tenantId) {
    throw new Error('No tenant found');
  }

  // Prevent deleting self
  if (userId === currentUser.id) {
    throw new Error('Vous ne pouvez pas vous supprimer vous-même');
  }

  // Get the user to delete
  const userToDelete = await db.query.users.findFirst({
    where: and(eq(users.id, userId), eq(users.tenantId, currentUser.tenantId)),
  });

  if (!userToDelete) {
    throw new Error('User not found');
  }

  // Prevent deleting super_admin
  if (userToDelete.role === 'super_admin') {
    throw new Error('Impossible de supprimer un super admin');
  }

  // Delete from Clerk first
  try {
    const client = await clerkClient();
    await client.users.deleteUser(userToDelete.clerkUserId);
  } catch (error) {
    console.error('Error deleting user from Clerk:', error);
    // Continue with database deletion even if Clerk deletion fails
    // The user might have already been deleted from Clerk manually
  }

  // Delete from database
  await db.delete(users).where(eq(users.id, userId));

  revalidatePath('/dashboard/settings/team');
}
