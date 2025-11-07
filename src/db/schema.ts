import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const user = pgTable(
  'User',
  {
    id: uuid()
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    createdAt: timestamp('created_at', {
      mode: 'string',
      precision: 3,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      mode: 'string',
      precision: 3,
    })
      .default(sql`now()`)
      .$onUpdate(() => sql`now()`)
      .notNull(),
    username: text().notNull(),
    password: text().notNull(),
  },
  (table) => [
    uniqueIndex('User_username_key').using(
      'btree',
      table.username.asc().nullsLast().op('text_ops'),
    ),
  ],
);

export const refreshToken = pgTable(
  'RefreshToken',
  {
    id: uuid()
      .default(sql`gen_random_uuid()`)
      .primaryKey()
      .notNull(),
    createdAt: timestamp('created_at', {
      mode: 'string',
      precision: 3,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      mode: 'string',
      precision: 3,
    })
      .default(sql`now()`)
      .$onUpdate(() => sql`now()`)
      .notNull(),
    value: text().notNull(),
    isRevoked: boolean('is_revoked').default(false).notNull(),
    expiresAt: timestamp('expires_at', {
      mode: 'string',
      precision: 3,
    }).notNull(),
    userId: uuid('user_id').notNull(),
  },
  (table) => [
    uniqueIndex('RefreshToken_value_key').using(
      'btree',
      table.value.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'RefreshToken_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);
