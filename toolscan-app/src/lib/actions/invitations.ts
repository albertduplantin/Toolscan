'use server';

import { db } from '@/lib/db';
import { invitations, users, tenants } from '@/lib/db/schema';
import { getCurrentDbUser } from '@/lib/clerk/utils';
import { eq, and, or, lt, gt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

/**
 * Generate a short 5-letter invitation code (uppercase)
 */
function generateInvitationToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like I, O, 0, 1
  let code = '';
  const randomBytes = crypto.randomBytes(5);

  for (let i = 0; i < 5; i++) {
    code += chars[randomBytes[i] % chars.length];
  }

  return code;
}

/**
 * Create an email invitation
 */
export async function createEmailInvitation(email: string, role: 'user' | 'admin' = 'user') {
  const currentUser = await getCurrentDbUser();

  if (!currentUser || !currentUser.tenantId) {
    throw new Error('User not authenticated or no tenant');
  }

  if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
    throw new Error('Only admins can send invitations');
  }

  // Check if user already exists in this tenant
  const existingUser = await db.query.users.findFirst({
    where: and(
      eq(users.email, email),
      eq(users.tenantId, currentUser.tenantId)
    ),
  });

  if (existingUser) {
    throw new Error('User is already a member of this organization');
  }

  // Check if there's already a pending invitation
  const existingInvitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.email, email),
      eq(invitations.tenantId, currentUser.tenantId),
      eq(invitations.status, 'pending')
    ),
  });

  if (existingInvitation) {
    throw new Error('An invitation has already been sent to this email');
  }

  const token = generateInvitationToken();

  const [invitation] = await db
    .insert(invitations)
    .values({
      tenantId: currentUser.tenantId,
      invitedBy: currentUser.id,
      type: 'email',
      token,
      email,
      role,
      maxUses: 1,
    })
    .returning();

  revalidatePath('/dashboard/settings/team');

  return invitation;
}

/**
 * Create a link invitation
 */
export async function createLinkInvitation(params: {
  role?: 'user' | 'admin';
  maxUses?: number | null;
  expiresInDays?: number | null;
}) {
  const currentUser = await getCurrentDbUser();

  if (!currentUser || !currentUser.tenantId) {
    throw new Error('User not authenticated or no tenant');
  }

  if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
    throw new Error('Only admins can create invitation links');
  }

  const token = generateInvitationToken();
  const expiresAt = params.expiresInDays
    ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const [invitation] = await db
    .insert(invitations)
    .values({
      tenantId: currentUser.tenantId,
      invitedBy: currentUser.id,
      type: 'link',
      token,
      role: params.role || 'user',
      maxUses: params.maxUses || null,
      expiresAt,
    })
    .returning();

  revalidatePath('/dashboard/settings/team');

  return invitation;
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string) {
  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.token, token),
    with: {
      tenant: true,
      inviter: {
        columns: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!invitation) {
    return null;
  }

  // Check if invitation is expired
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    // Auto-expire
    await db
      .update(invitations)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(invitations.id, invitation.id));
    return null;
  }

  // Check if invitation has reached max uses
  if (invitation.maxUses && invitation.usesCount >= invitation.maxUses) {
    return null;
  }

  // Check if invitation is not pending
  if (invitation.status !== 'pending') {
    return null;
  }

  return invitation;
}

/**
 * Accept an invitation (called after user signs up)
 */
export async function acceptInvitation(token: string, userId: string) {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }

  // Get the user
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if user already has a tenant
  if (user.tenantId) {
    throw new Error('User already belongs to an organization');
  }

  // For email invitations, verify the email matches
  if (invitation.type === 'email' && invitation.email !== user.email) {
    throw new Error('Email does not match invitation');
  }

  // Update user with tenant and role
  await db
    .update(users)
    .set({
      tenantId: invitation.tenantId,
      role: invitation.role,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Update invitation
  const newStatus = invitation.maxUses === 1 ? 'accepted' : 'pending';
  const newUsesCount = invitation.usesCount + 1;

  await db
    .update(invitations)
    .set({
      status: newStatus,
      usesCount: newUsesCount,
      acceptedBy: userId,
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, invitation.id));

  // Don't revalidate here - the calling code will redirect anyway

  return { tenantId: invitation.tenantId, role: invitation.role };
}

/**
 * Get all invitations for current tenant
 */
export async function getTenantInvitations() {
  const currentUser = await getCurrentDbUser();

  if (!currentUser || !currentUser.tenantId) {
    throw new Error('User not authenticated or no tenant');
  }

  const tenantId = currentUser.tenantId;

  const allInvitations = await db.query.invitations.findMany({
    where: eq(invitations.tenantId, tenantId),
    orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
    with: {
      inviter: {
        columns: {
          id: true,
          email: true,
        },
      },
      accepter: {
        columns: {
          id: true,
          email: true,
        },
      },
    },
  });

  return allInvitations;
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string) {
  const currentUser = await getCurrentDbUser();

  if (!currentUser || !currentUser.tenantId) {
    throw new Error('User not authenticated or no tenant');
  }

  if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
    throw new Error('Only admins can revoke invitations');
  }

  const tenantId = currentUser.tenantId;

  // Verify invitation belongs to tenant
  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.id, invitationId),
      eq(invitations.tenantId, tenantId)
    ),
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  await db
    .update(invitations)
    .set({
      status: 'revoked',
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, invitationId));

  revalidatePath('/dashboard/settings/team');

  return { success: true };
}

/**
 * Delete an invitation
 */
export async function deleteInvitation(invitationId: string) {
  const currentUser = await getCurrentDbUser();

  if (!currentUser || !currentUser.tenantId) {
    throw new Error('User not authenticated or no tenant');
  }

  if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
    throw new Error('Only admins can delete invitations');
  }

  const tenantId = currentUser.tenantId;

  // Verify invitation belongs to tenant
  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.id, invitationId),
      eq(invitations.tenantId, tenantId)
    ),
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  await db.delete(invitations).where(eq(invitations.id, invitationId));

  revalidatePath('/dashboard/settings/team');

  return { success: true };
}
