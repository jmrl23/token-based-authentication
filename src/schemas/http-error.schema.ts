import { FromSchema } from 'json-schema-to-ts';
import { asJsonSchema } from '../common/typings';

export type HttpErrorSchema = FromSchema<typeof httpErrorSchema>;
export const httpErrorSchema = asJsonSchema({
  type: 'object',
  description: 'error response structure',
  required: ['statusCode', 'error', 'message'],
  properties: {
    statusCode: {
      type: 'integer',
      examples: [404],
    },
    error: {
      type: 'string',
      examples: ['Not found'],
    },
    message: {
      type: 'string',
      examples: ['Not found'],
    },
  },
});
