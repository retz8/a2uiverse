import {TextFieldApi as BasicTextFieldApi} from '@a2ui/web_core/catalogs/basic/v1';
import {spec} from '@a2ui/web_core/v1_0';
import {z} from 'zod';

/**
 * The basic catalog's `TextField` less its credential input (SPEC §4.2, axiom 1, task-12.3): no
 * `obscured` variant, so no shell surface can paint a password field. Every other prop is
 * upstream's own.
 */
export const TEXT_FIELD_VARIANTS = ['longText', 'number', 'shortText'] as const;

export const TextFieldApi = {
  ...BasicTextFieldApi,
  // `extend` drops upstream's annotation; the entry carries it again, so the document is the
  // basic catalog's own.
  schema: spec(
    BasicTextFieldApi.schema.extend({
      variant: z
        .enum(TEXT_FIELD_VARIANTS)
        .default('shortText')
        .describe('The type of input field to display.')
        .optional(),
    }),
    {mixins: ['Checkable']},
  ),
};
