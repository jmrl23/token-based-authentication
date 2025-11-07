import { FromSchema } from 'json-schema-to-ts';
import { asJsonSchema } from '../../../common/typings';
import { userSchema } from './user.schema';

export type SessionSchema = FromSchema<typeof sessionSchema>;
export const sessionSchema = asJsonSchema({
  type: 'object',
  additionalProperties: false,
  required: ['user'],
  properties: {
    user: userSchema,
  },
});
