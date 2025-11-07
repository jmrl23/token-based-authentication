import { preHandlerAsyncHookHandler } from 'fastify';
import { Unauthorized } from 'http-errors';

export const requiredAccess: preHandlerAsyncHookHandler = async function (
  request,
) {
  const [schema, token] = request.headers.authorization?.split(' ') ?? [];
  if (schema !== 'Bearer') {
    throw new Unauthorized('User not found');
  }
  const user = await this.authService.getUserFromAccessToken(token);
  request.user = user;
  if (!request.user) {
    throw new Unauthorized('User not found');
  }
};
