import { FastifyRequest } from 'fastify';
import { asJsonSchema, asRoute } from '../../common/typings';
import { httpErrorSchema } from '../../schemas/http-error.schema';
import { requiredAccess } from '../auth/prehandlers/required-access';
import { userSchema } from '../auth/schemas/user.schema';
import {
  GetCurrentSessionSchema,
  getCurrentSessionSchema,
} from './schemas/get-current-session';

export default asRoute(async function userRoute(app) {
  app.route({
    method: 'GET',
    url: '/session',
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1m',
      },
    },
    schema: {
      description: 'get current user',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      querystring: getCurrentSessionSchema,
      response: {
        default: httpErrorSchema,
        200: asJsonSchema({
          type: 'object',
          description: 'current user',
          additionalProperties: false,
          required: ['data'],
          properties: {
            data: {
              ...userSchema,
              nullable: true,
            },
          },
        }),
      },
    },
    preHandler: requiredAccess,
    async handler(
      request: FastifyRequest<{
        Querystring: GetCurrentSessionSchema;
      }>,
    ) {
      const [, accessToken] = request.headers.authorization?.split(' ') ?? [];
      const user = await this.authService.getUserFromAccessToken(
        accessToken,
        request.query.revalidate,
      );
      return {
        data: user,
      };
    },
  });
});
