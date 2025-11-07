import { asJsonSchema, asRoute } from '../../common/typings';
import { httpErrorSchema } from '../../schemas/http-error.schema';
import { requiredAccess } from '../auth/prehandlers/required-access';
import { userSchema } from '../auth/schemas/user.schema';

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
    async handler(request) {
      return {
        data: request.user,
      };
    },
  });
});
