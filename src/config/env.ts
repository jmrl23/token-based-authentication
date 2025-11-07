import * as env from 'env-var';
import fs from 'node:fs';
import path from 'node:path';

export const PORT = env.get('PORT').default(3001).asPortNumber();

export const TRUST_PROXY = env.get('TRUST_PROXY').required().asArray();

export const DATABASE_URL = env.get('DATABASE_URL').required().asString();

export const CORS_ORIGIN = env.get('CORS_ORIGIN').asArray(',');

export const COOKIE_SECRET = env.get('COOKIE_SECRET').required().asString();

export const REDIS_URL = env.get('REDIS_URL').required().asString();

export const JWT_SECRET_PRIVATE = fs.readFileSync(
  path.resolve(__dirname, '../../auth/jwt'),
  'utf-8',
);

export const JWT_SECRET_PUBLIC = fs.readFileSync(
  path.resolve(__dirname, '../../auth/jwt.pub'),
  'utf-8',
);
