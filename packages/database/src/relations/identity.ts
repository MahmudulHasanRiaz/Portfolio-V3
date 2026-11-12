import { relations } from "drizzle-orm";
import * as schema from "../schema";

export const usersRelations = relations(schema.users, ({ many }) => ({
  sessions: many(schema.sessions),
  accounts: many(schema.accounts),
  userRoles: many(schema.userRoles),
  verificationTokens: many(schema.verificationTokens),
}));

export const rolesRelations = relations(schema.roles, ({ many }) => ({
  rolePermissions: many(schema.rolePermissions),
  userRoles: many(schema.userRoles),
}));

export const permissionsRelations = relations(schema.permissions, ({ many }) => ({
  rolePermissions: many(schema.rolePermissions),
}));

export const sessionsRelations = relations(schema.sessions, ({ one }) => ({
  user: one(schema.users, {
    fields: [schema.sessions.userId],
    references: [schema.users.id],
  }),
}));

export const accountsRelations = relations(schema.accounts, ({ one }) => ({
  user: one(schema.users, {
    fields: [schema.accounts.userId],
    references: [schema.users.id],
  }),
}));

export const userRolesRelations = relations(schema.userRoles, ({ one }) => ({
  user: one(schema.users, {
    fields: [schema.userRoles.userId],
    references: [schema.users.id],
  }),
  role: one(schema.roles, {
    fields: [schema.userRoles.roleId],
    references: [schema.roles.id],
  }),
}));

export const rolePermissionsRelations = relations(schema.rolePermissions, ({ one }) => ({
  role: one(schema.roles, {
    fields: [schema.rolePermissions.roleId],
    references: [schema.roles.id],
  }),
  permission: one(schema.permissions, {
    fields: [schema.rolePermissions.permissionId],
    references: [schema.permissions.id],
  }),
}));

export const verificationTokensRelations = relations(schema.verificationTokens, ({ one }) => ({
  user: one(schema.users, {
    fields: [schema.verificationTokens.userId],
    references: [schema.users.id],
  }),
}));

export const personProfilesRelations = relations(schema.personProfiles, ({ one }) => ({
  developerProfile: one(schema.developerProfiles),
  entrepreneurProfile: one(schema.entrepreneurProfiles),
  artistProfile: one(schema.artistProfiles),
}));

export const developerProfilesRelations = relations(schema.developerProfiles, ({ one }) => ({
  personProfile: one(schema.personProfiles, {
    fields: [schema.developerProfiles.id],
    references: [schema.personProfiles.id],
  }),
}));

export const entrepreneurProfilesRelations = relations(schema.entrepreneurProfiles, ({ one }) => ({
  personProfile: one(schema.personProfiles, {
    fields: [schema.entrepreneurProfiles.id],
    references: [schema.personProfiles.id],
  }),
}));

export const artistProfilesRelations = relations(schema.artistProfiles, ({ one }) => ({
  personProfile: one(schema.personProfiles, {
    fields: [schema.artistProfiles.id],
    references: [schema.personProfiles.id],
  }),
}));
