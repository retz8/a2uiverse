/** A signed-in account's extended card beside the public card (task-20.8 decisions 1, 3, 5). */
import {describe, expect, test} from 'vitest';
import {accountCardAdds, servesExtendedCard, signInBeyond} from './accountCard.js';
import {readCard} from './readCard.js';

const publicCard = readCard({
  name: 'Shop B',
  description: 'Cameras',
  version: '0.1.0',
  supportedInterfaces: [
    {url: 'http://localhost:1/a2a', protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
  ],
  capabilities: {extendedAgentCard: true},
  securitySchemes: {key: {apiKeySecurityScheme: {location: 'header', name: 'X-Key'}}},
  securityRequirements: [{schemes: {key: {list: []}}}],
  skills: [{id: 'search', name: 'Search', description: 'Finds cameras', tags: ['cameras']}],
});

describe('servesExtendedCard', () => {
  test("the A2A 1.0 flag, and A2A 0.3's as the reading carries it", () => {
    expect(servesExtendedCard(publicCard)).toBe(true);
    const legacy = readCard({
      name: 'Shop B',
      description: 'Cameras',
      version: '0.1.0',
      protocolVersion: '0.3.0',
      url: 'http://localhost:1/a2a',
      capabilities: {},
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
      skills: [],
      supportsAuthenticatedExtendedCard: true,
    });
    expect(servesExtendedCard(legacy)).toBe(true);
    expect(servesExtendedCard({...publicCard, capabilities: {extensions: []}})).toBe(false);
  });
});

describe('accountCardAdds', () => {
  test('the name, the description and each skill the public card does not hold the same', () => {
    const account = {
      ...publicCard,
      name: 'Shop B for Alice',
      skills: [
        ...publicCard.skills,
        {
          id: 'orders',
          name: 'Orders',
          description: 'Lists your orders',
          tags: [],
          examples: ['my orders'],
          inputModes: [],
          outputModes: [],
          securityRequirements: [],
        },
      ],
    };
    expect(accountCardAdds(publicCard, account)).toEqual({
      name: 'Shop B for Alice',
      skills: [expect.objectContaining({id: 'orders'})],
    });
  });

  test('a skill held under the same id but said otherwise is one it adds', () => {
    const account = {
      ...publicCard,
      skills: [{...publicCard.skills[0]!, description: 'Finds cameras, members prices'}],
    };
    expect(accountCardAdds(publicCard, account)?.skills.map(({id}) => id)).toEqual(['search']);
  });

  test('none for a card that says nothing more', () => {
    expect(accountCardAdds(publicCard, {...publicCard})).toBeUndefined();
    expect(accountCardAdds(publicCard, {...publicCard, skills: []})).toBeUndefined();
  });
});

describe('signInBeyond', () => {
  test('a scheme the public card does not declare, and a scope it does not ask', () => {
    const account = readCard({
      name: 'Shop B',
      version: '0.1.0',
      supportedInterfaces: publicCard.supportedInterfaces,
      securitySchemes: {
        key: {apiKeySecurityScheme: {location: 'header', name: 'X-Key'}},
        staff: {httpAuthSecurityScheme: {scheme: 'bearer'}},
      },
      securityRequirements: [{schemes: {key: {list: ['orders']}}}, {schemes: {staff: {list: []}}}],
      skills: [],
    });
    expect(signInBeyond(publicCard, account)).toEqual({
      schemes: ['staff'],
      scopes: [{scheme: 'key', scope: 'orders'}],
    });
    expect(signInBeyond(publicCard, publicCard)).toEqual({schemes: [], scopes: []});
  });
});
