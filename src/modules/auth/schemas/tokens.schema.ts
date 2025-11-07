import { FromSchema } from 'json-schema-to-ts';
import { asJsonSchema } from '../../../common/typings';

export type RefreshTokenSchema = FromSchema<typeof refreshTokenSchema>;
export const refreshTokenSchema = asJsonSchema({
  type: 'string',
});

export type AccessTokenSchema = FromSchema<typeof accessTokenSchema>;
export const accessTokenSchema = asJsonSchema({
  type: 'string',
});

export type TokenSchema = FromSchema<typeof tokensSchema>;
export const tokensSchema = asJsonSchema({
  type: 'object',
  additionalProperties: false,
  required: ['refresh_token', 'access_token'],
  properties: {
    refresh_token: refreshTokenSchema,
    access_token: accessTokenSchema,
  },
});
