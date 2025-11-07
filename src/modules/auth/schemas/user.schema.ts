import { FromSchema } from 'json-schema-to-ts';
import { asJsonSchema } from '../../../common/typings';

export type UserSchema = FromSchema<typeof userSchema>;
export const userSchema = asJsonSchema({
  type: 'object',
  additionalProperties: false,
  required: ['id', 'username'],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
    },
    username: {
      type: 'string',
    },
  },
});
