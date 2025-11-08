import { asJsonSchema, asRoute } from '../../common/typings';
import { httpErrorSchema } from '../../schemas/http-error.schema';
import { JwksService } from '../../services/jwks.service';

export const prefix = '/';

export default asRoute(async function appRoute(app) {
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
                additionalProperties: true,
              },
            },
          },
        }),
      },
    },
    async handler() {
      const jwks = await JwksService.getJwks();

      console.log(jwks);

      return {
        keys: jwks,
      };
    },
  });
});
