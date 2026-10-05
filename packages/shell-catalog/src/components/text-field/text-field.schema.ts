import {TextFieldApi as BasicTextFieldApi} from '@a2ui/web_core/v0_9';
import {z} from 'zod';

/**
 * The basic catalog's `TextField` less its credential input (SPEC §4.2, axiom 1, task-12.3): no
 * `obscured` variant, so no shell surface can paint a password field. Every other prop is
 * upstream's own.
 */
export const TEXT_FIELD_VARIANTS = ['longText', 'number', 'shortText'] as const;

export const TextFieldApi = {
  ...BasicTextFieldApi,
  schema: BasicTextFieldApi.schema.extend({
    variant: z
      .enum(TEXT_FIELD_VARIANTS)
      .default('shortText')
      .describe('The type of input field to display.')
      .optional(),
  }),
};
