import {jsonSchema} from 'ai';
import {SLOT_ARCHETYPES, type SlotArchetype} from './archetypes.js';

/**
 * The plan's layout is a depth-capped alternating row/column tree, unrolled
 * so the schema stays union-free (Gemini structured output tolerates no
 * anyOf/$ref): the root lays its groups on `direction`; a group with several
 * slots is a container on the opposite axis; a single-slot group renders
 * bare. Exactly the depth-2 tree.
 */
export interface PlanSlot {
  appId: string;
  archetype: SlotArchetype;
  /** The Planner-authored request dispatched to the agent — prose carrying all guidance. */
  request: string;
}

export interface PlanGroup {
  slots: PlanSlot[];
}

export interface Plan {
  direction: 'row' | 'column';
  groups: PlanGroup[];
}

export const planSchema = jsonSchema<Plan>({
  type: 'object',
  additionalProperties: false,
  required: ['direction', 'groups'],
  properties: {
    direction: {
      type: 'string',
      enum: ['row', 'column'],
      description: 'Main axis the groups are laid out on.',
    },
    groups: {
      type: 'array',
      description:
        'Layout rows/columns in order. A group with several slots lays them out on the opposite axis.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slots'],
        properties: {
          slots: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['appId', 'archetype', 'request'],
              properties: {
                appId: {type: 'string', description: 'Id of the agent filling this slot.'},
                archetype: {
                  type: 'string',
                  enum: [...SLOT_ARCHETYPES],
                  description: 'Shape class of the slot container.',
                },
                request: {
                  type: 'string',
                  description:
                    'The message sent to this agent: what to show, plus any size/shape guidance, in plain language.',
                },
              },
            },
          },
        },
      },
    },
  },
});
