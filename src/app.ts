import fastify from 'fastify';
import { logger } from './common/logger';
import { TRUST_PROXY } from './config/env';

export const app = fastify({
  loggerInstance: logger,
  trustProxy: TRUST_PROXY,
  routerOptions: {
    ignoreTrailingSlash: true,
  },
});
