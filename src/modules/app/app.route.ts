import KeyvRedis from '@keyv/redis';
import { createCache } from 'cache-manager';
import Keyv from 'keyv';
import ms from 'ms';
import { asJsonSchema, asRoute } from '../../common/typings';
import { REDIS_URL } from '../../config/env';
import { httpErrorSchema } from '../../schemas/http-error.schema';
import { JwksService } from '../../services/jwks.service';

export const prefix = '/';

export default asRoute(async function appRoute(app) {
  const cache = createCache({
    stores: [
      new Keyv({
        namespace: 'app',
        store: new KeyvRedis(REDIS_URL),
      }),
    ],
  });

  app.route({
    method: 'GET',
    url: '/well-known/jwks.json',
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1m',
      },
    },
    schema: {
      description: 'get jwks',
      tags: ['Well-known'],
      response: {
        default: httpErrorSchema,
        200: asJsonSchema({
          type: 'object',
          description: 'jwks',
          required: ['keys'],
          properties: {
            keys: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
          },
        }),
      },
    },
    async handler() {
      const CACHE_KEY = 'well-known:jwks';
      const cached = await cache.get(CACHE_KEY);
      if (cached) {
        return {
          keys: cached,
        };
      }
      const jwks = await JwksService.generateJwks();
      await cache.set(CACHE_KEY, jwks, ms('30m'));
      return {
        keys: jwks,
      };
    },
  });
});
