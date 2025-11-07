import fastifyCors from '@fastify/cors';
import fastifyEtag from '@fastify/etag';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import KeyvRedis from '@keyv/redis';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { fastifyPlugin } from 'fastify-plugin';
import { NotFound } from 'http-errors';
import Redis from 'ioredis';
import Keyv from 'keyv';
import path from 'node:path';
import { db } from './common/db';
import { logger } from './common/logger';
import {
  COOKIE_SECRET,
  CORS_ORIGIN,
  JWT_SECRET_PRIVATE,
  JWT_SECRET_PUBLIC,
  REDIS_URL,
} from './config/env';
import { auth } from './modules/auth/plugins/auth';
import { routesAutoload } from './plugins/routesAutoload';
import { swagger } from './plugins/swagger';

interface Options {}

export const bootstrap: FastifyPluginAsync<Options> = fastifyPlugin(
  async function (app) {
    await app.register(fastifyEtag);

    if (CORS_ORIGIN && CORS_ORIGIN.length > 0) {
      await app.register(fastifyCors, {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
      });
    }

    if (process.env.NODE_ENV === 'production') {
      await app.register(fastifyHelmet, {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: [`'none'`],
            formAction: [`'none'`],
            frameAncestors: [`'none'`],
            scriptSrc: [`'none'`],
            styleSrc: [`'none'`],
            fontSrc: [`'none'`],
            imgSrc: [`'none'`],
            mediaSrc: [`'none'`],
            connectSrc: [`'none'`],
            objectSrc: [`'none'`],
            baseUri: [`'none'`],
            manifestSrc: [`'none'`],
            workerSrc: [`'none'`],
          },
        },
        global: true,
      });
    } else {
      await app.register(swagger);
    }

    await app.register(auth, {
      prefix: '/',
      cacheStores: [
        new Keyv({
          namespace: 'auth',
          store: new KeyvRedis(REDIS_URL),
        }),
      ],
      db,
      cookieSecret: COOKIE_SECRET,
      jwt: {
        private: JWT_SECRET_PRIVATE,
        public: JWT_SECRET_PUBLIC,
      },
    });

    await app.register(fastifyRateLimit, {
      redis: new Redis(REDIS_URL),
      max: 120,
      timeWindow: '1m',
      nameSpace: 'rate_limit:',
      global: true,
    });

    await app.register(routesAutoload, {
      dirPath: path.resolve(__dirname, './modules'),
      callback(routes) {
        for (const route of routes) {
          logger.info(`registered route {${route}}`);
        }
      },
    });

    await postConfigurations(app);
  },
);

async function postConfigurations(app: FastifyInstance) {
  app.setNotFoundHandler(async function notFoundHandler(request) {
    throw new NotFound(`Cannot ${request.method} ${request.url}`);
  });

  app.setErrorHandler(async function errorHandler(error) {
    if (!error.statusCode || error.statusCode > 499) {
      logger.error(error.stack ?? error.message);
    }
    return error;
  });
}
