import { pgTable, uuid, varchar, text, timestamp, integer, decimal, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', ['super_admin', 'admin', 'user']);
export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'pro', 'business', 'enterprise']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'past_due', 'trialing', 'incomplete']);
export const cabinetStatusEnum = pgEnum('cabinet_status', ['draft', 'configured', 'active', 'archived']);
export const invitationTypeEnum = pgEnum('invitation_type', ['email', 'link']);
export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'accepted', 'expired', 'revoked']);

// Tenants table
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  subscriptionTier: subscriptionTierEnum('subscription_tier').notNull().default('free'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  subscriptionStatus: subscriptionStatusEnum('subscription_status').default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull().unique(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  role: roleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Cabinets (Armoires) table
export const cabinets = pgTable('cabinets', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  emptyImageUrl: varchar('empty_image_url', { length: 500 }),
  fullImageUrl: varchar('full_image_url', { length: 500 }),
  configData: jsonb('config_data'), // Coordonnées des silhouettes détectées
  status: cabinetStatusEnum('status').notNull().default('draft'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tools table
export const tools = pgTable('tools', {
  id: uuid('id').defaultRandom().primaryKey(),
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  reference: varchar('reference', { length: 100 }), // Référence fabricant
  positionData: jsonb('position_data').notNull(), // {x, y, width, height}
  silhouetteData: jsonb('silhouette_data'), // Coordonnées précises du polygon
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Verifications table
export const verifications = pgTable('verifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'cascade' }).notNull(),
  verifiedBy: uuid('verified_by').references(() => users.id).notNull(),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  resultData: jsonb('result_data').notNull(), // {missing_tools: [], detected_tools: []}
  missingCount: integer('missing_count').notNull().default(0),
  completionRate: decimal('completion_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  verifiedAt: timestamp('verified_at').defaultNow().notNull(),
});

// Subscription Usage table
export const subscriptionUsage = pgTable('subscription_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  verificationsCount: integer('verifications_count').notNull().default(0),
  storageUsedMb: integer('storage_used_mb').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Invitations table
export const invitations = pgTable('invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  invitedBy: uuid('invited_by').references(() => users.id).notNull(),
  type: invitationTypeEnum('type').notNull(),
  status: invitationStatusEnum('status').notNull().default('pending'),
  token: varchar('token', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }), // Only for email invitations
  role: roleEnum('role').notNull().default('user'),
  maxUses: integer('max_uses'), // null = unlimited
  usesCount: integer('uses_count').notNull().default(0),
  expiresAt: timestamp('expires_at'), // null = never expires
  acceptedBy: uuid('accepted_by').references(() => users.id),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  cabinets: many(cabinets),
  usageRecords: many(subscriptionUsage),
  invitations: many(invitations),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  cabinetsCreated: many(cabinets),
  verifications: many(verifications),
  invitationsSent: many(invitations, { relationName: 'invitedBy' }),
  invitationsAccepted: many(invitations, { relationName: 'acceptedBy' }),
}));

export const cabinetsRelations = relations(cabinets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [cabinets.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [cabinets.createdBy],
    references: [users.id],
  }),
  tools: many(tools),
  verifications: many(verifications),
}));

export const toolsRelations = relations(tools, ({ one }) => ({
  cabinet: one(cabinets, {
    fields: [tools.cabinetId],
    references: [cabinets.id],
  }),
}));

export const verificationsRelations = relations(verifications, ({ one }) => ({
  cabinet: one(cabinets, {
    fields: [verifications.cabinetId],
    references: [cabinets.id],
  }),
  verifier: one(users, {
    fields: [verifications.verifiedBy],
    references: [users.id],
  }),
}));

export const subscriptionUsageRelations = relations(subscriptionUsage, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subscriptionUsage.tenantId],
    references: [tenants.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [invitations.tenantId],
    references: [tenants.id],
  }),
  inviter: one(users, {
    relationName: 'invitedBy',
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
  accepter: one(users, {
    relationName: 'acceptedBy',
    fields: [invitations.acceptedBy],
    references: [users.id],
  }),
}));

// Types
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Cabinet = typeof cabinets.$inferSelect;
export type NewCabinet = typeof cabinets.$inferInsert;

export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;

export type SubscriptionUsage = typeof subscriptionUsage.$inferSelect;
export type NewSubscriptionUsage = typeof subscriptionUsage.$inferInsert;

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
