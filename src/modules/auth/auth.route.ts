import { FastifyRequest } from 'fastify';
import { Unauthorized } from 'http-errors';
import ms from 'ms';
import { asJsonSchema, asRoute } from '../../common/typings';
import { JWT_SECRET_PUBLIC } from '../../config/env';
import { httpErrorSchema } from '../../schemas/http-error.schema';
import { requiredAccess } from './prehandlers/required-access';
import { loginUserSchema } from './schemas/login-user.schema';
import {
  RegisterUserSchema,
  registerUserSchema,
} from './schemas/register-user.schema';
import { accessTokenSchema } from './schemas/tokens.schema';

export default asRoute(async function authRoute(app) {
  app

    .route({
      method: 'GET',
      url: '/',
      schema: {
        description: 'expose public RSA key',
        tags: ['Auth'],
        returns: {
          200: asJsonSchema({ type: 'string' }),
        },
      },
      async handler() {
        return JWT_SECRET_PUBLIC;
      },
    })

    .route({
      method: 'POST',
      url: '/sign-up',
      config: {
        rateLimit: {
          timeWindow: '1m',
          max: 10,
        },
      },
      schema: {
        description: 'sign-up a user',
        tags: ['Auth'],
        body: registerUserSchema,
        response: {
          default: httpErrorSchema,
          200: asJsonSchema({
            type: 'object',
            description: 'access token of the signed-up user',
            additionalProperties: false,
            required: ['data'],
            properties: {
              data: {
                type: 'object',
                additionalProperties: false,
                required: ['access_token'],
                properties: {
                  access_token: accessTokenSchema,
                },
              },
            },
          }),
        },
      },
      async handler(
        request: FastifyRequest<{
          Body: RegisterUserSchema;
        }>,
        reply,
      ) {
        const { username, password } = request.body;
        const tokens = await this.authService.register(username, password);
        const data = {
          access_token: tokens.access_token,
        };
        const cookieExpiration = new Date(Date.now() + ms('90d'));
        reply.setCookie('refresh_token', tokens.refresh_token, {
          expires: cookieExpiration,
        });
        return {
          data,
        };
      },
    })

    .route({
      method: 'POST',
      url: '/sign-in',
      config: {
        rateLimit: {
          timeWindow: '1m',
          max: 10,
        },
      },
      schema: {
        description: 'sign-in user',
        tags: ['Auth'],
        body: loginUserSchema,
        response: {
          default: httpErrorSchema,
          200: asJsonSchema({
            type: 'object',
            description: 'access token of the signed-in user',
            additionalProperties: false,
            required: ['data'],
            properties: {
              data: {
                type: 'object',
                additionalProperties: false,
                required: ['access_token'],
                properties: {
                  access_token: accessTokenSchema,
                },
              },
            },
          }),
        },
      },
      async handler(
        request: FastifyRequest<{
          Body: RegisterUserSchema;
        }>,
        reply,
      ) {
        const { username, password } = request.body;
        const tokens = await this.authService.login(username, password);
        const data = {
          access_token: tokens.access_token,
        };
        const cookieExpiration = new Date(Date.now() + ms('90d'));
        reply.setCookie('refresh_token', tokens.refresh_token, {
          expires: cookieExpiration,
        });
        return {
          data,
        };
      },
    })

    .route({
      method: 'POST',
      url: '/access',
      config: {
        rateLimit: {
          timeWindow: '1m',
          max: 5,
        },
      },
      schema: {
        description: 'generate new access token',
        tags: ['Auth'],
        response: {
          default: httpErrorSchema,
          200: asJsonSchema({
            type: 'object',
            description: 'generated access token',
            additionalProperties: false,
            required: ['data'],
            properties: {
              data: {
                type: 'object',
                additionalProperties: false,
                required: ['access_token'],
                properties: {
                  access_token: accessTokenSchema,
                },
              },
            },
          }),
        },
      },
      async handler(request) {
        const refreshToken = request.cookies.refresh_token;
        if (!refreshToken) {
          throw new Unauthorized('Invalid refresh token');
        }
        const accessToken =
          await this.authService.rotateAccessToken(refreshToken);
        return {
          data: {
            access_token: accessToken,
          },
        };
      },
    })

    .route({
      method: 'POST',
      url: '/refresh',
      config: {
        rateLimit: {
          timeWindow: '1m',
          max: 5,
        },
      },
      schema: {
        description: 'revalidate tokens',
        tags: ['Auth'],
        response: {
          default: httpErrorSchema,
          200: asJsonSchema({
            type: 'object',
            description: 'generated access token',
            additionalProperties: false,
            required: ['data'],
            properties: {
              data: {
                type: 'object',
                additionalProperties: false,
                required: ['access_token'],
                properties: {
                  access_token: accessTokenSchema,
                },
              },
            },
          }),
        },
      },
      async handler(request, reply) {
        const refreshToken = request.cookies.refresh_token;
        if (!refreshToken) {
          throw new Unauthorized('No refresh token');
        }
        const tokens = await this.authService.rotateTokens(refreshToken);
        const cookieExpiration = new Date(Date.now() + ms('90d'));
        reply.setCookie('refresh_token', tokens.refresh_token, {
          expires: cookieExpiration,
        });
        return {
          data: {
            access_token: tokens.access_token,
          },
        };
      },
    })

    .route({
      method: 'DELETE',
      url: '/sign-out',
      config: {
        rateLimit: {
          timeWindow: '1m',
          max: 5,
        },
      },
      schema: {
        description: 'logout user',
        tags: ['Auth'],
        security: [
          {
            bearerAuth: [],
          },
        ],
        response: {
          default: httpErrorSchema,
          204: asJsonSchema({
            type: 'string',
            description: 'successfully signed-out',
            examples: ['HTTP 204 No Content'],
          }),
        },
      },
      preHandler: [requiredAccess],
      async handler(request, reply) {
        const refreshToken = request.cookies.refresh_token;
        if (!refreshToken) {
          throw new Unauthorized('Invalid refresh token');
        }
        await this.authService.logout(refreshToken);
        reply
          .clearCookie('refresh_token')
          .status(204)
          .send('HTTP 204 No Content');
      },
    });
});
