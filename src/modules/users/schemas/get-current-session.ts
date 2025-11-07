import { FromSchema } from 'json-schema-to-ts';
import { asJsonSchema } from '../../../common/typings';

export type GetCurrentSessionSchema = FromSchema<
  typeof getCurrentSessionSchema
>;
export const getCurrentSessionSchema = asJsonSchema({
  type: 'object',
  additionalProperties: false,
  required: [],
  properties: {
    revalidate: {
      type: 'boolean',
    },
  },
});
