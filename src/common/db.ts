import { drizzle } from 'drizzle-orm/node-postgres';
import { DATABASE_URL } from '../config/env';
import * as schema from '../db/schema';

export const db = drizzle(DATABASE_URL, { schema });
