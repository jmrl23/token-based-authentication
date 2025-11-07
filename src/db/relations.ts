import { relations } from 'drizzle-orm/relations';
import { user, refreshToken } from './schema';

export const refreshTokenRelations = relations(refreshToken, ({ one }) => ({
  user: one(user, {
    fields: [refreshToken.userId],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  refreshTokens: many(refreshToken),
}));
