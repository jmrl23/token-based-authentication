import fastifyCookie from '@fastify/cookie';
import { createCache } from 'cache-manager';
import { drizzle } from 'drizzle-orm/node-postgres';
import fastifyPlugin from 'fastify-plugin';
import Keyv from 'keyv';
import { PEM_EXPORT_PATH } from '../../../config/env';
import { AuthService } from '../auth.service';
import { UserSchema } from '../schemas/user.schema';

declare module 'fastify' {
  interface FastifyInstance {
    authService: AuthService;
  }

  interface FastifyRequest {
    user?: UserSchema | null;
  }
}

type Options = {
  cacheStores: Keyv[];
  db: ReturnType<typeof drizzle>;
  cookieSecret: string;
};

export const auth = fastifyPlugin<Options>(async function auth(app, options) {
  const cache = createCache({
    stores: options.cacheStores,
  });
  const authService = new AuthService(cache, options.db, PEM_EXPORT_PATH);

  await app.register(fastifyCookie, {
    secret: options.cookieSecret,
    hook: 'onRequest',
    parseOptions: {
      sameSite: 'lax',
      secure: 'auto',
      httpOnly: true,
      path: '/',
    },
  });

  app.decorate('authService', authService);
});
