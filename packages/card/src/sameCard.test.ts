/** When two cards are the same card (task-20.3 decision 12). */
import type {AgentCard} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {readCard} from './readCard.js';
import {sameCard} from './sameCard.js';
import {fixture} from './trackedCards.js';

const read = (name: string): AgentCard => readCard(fixture(name));

describe('sameCard', () => {
  test('one card in A2A 0.3’s shape and in 1.0’s is the same card', () => {
    expect(sameCard(read('python-as-0.3.json'), read('python-1.0-then-0.3.json'))).toBe(true);
  });

  test('a change of the bindings and A2A versions served, and nothing else, is no change', () => {
    expect(sameCard(read('python-1.0.json'), read('python-1.0-then-0.3.json'))).toBe(true);
    expect(sameCard(read('python-1.0.json'), read('python-1.0-grpc-and-rest.json'))).toBe(true);
  });

  test('an interface’s URL and tenant are set aside', () => {
    const card = read('python-1.0.json');
    const moved: AgentCard = {
      ...card,
      supportedInterfaces: [
        {
          url: 'https://elsewhere.example/a2a',
          protocolBinding: 'JSONRPC',
          protocolVersion: '1.0',
          tenant: 'acme',
        },
      ],
    };
    expect(sameCard(card, moved)).toBe(true);
  });

  test('signatures are set aside', () => {
    const card = read('python-1.0.json');
    const signed: AgentCard = {
      ...card,
      signatures: [{protected: 'e30', signature: 'c2ln', header: undefined}],
    };
    expect(sameCard(card, signed)).toBe(true);
  });

  test('a field the reading does not name counts for nothing', () => {
    const served = fixture('python-1.0.json') as object;
    expect(sameCard(readCard(served), readCard({...served, somethingElse: true}))).toBe(true);
  });

  test.each<[string, (card: AgentCard) => AgentCard]>([
    ['the name', card => ({...card, name: 'Another Agent'})],
    ['the description', card => ({...card, description: 'changed'})],
    ['the version', card => ({...card, version: '0.2.0'})],
    [
      'the provider',
      card => ({...card, provider: {organization: 'Other', url: 'https://o.example'}}),
    ],
    ['the documentation URL', card => ({...card, documentationUrl: 'https://example.com/other'})],
    ['a capability', card => ({...card, capabilities: {...card.capabilities!, streaming: false}})],
    [
      'an extension’s params',
      card => ({
        ...card,
        capabilities: {
          ...card.capabilities!,
          extensions: card.capabilities!.extensions.map(extension => ({
            ...extension,
            params: {supportedCatalogIds: ['https://example.com/catalogs/other/v1/catalog.json']},
          })),
        },
      }),
    ],
    [
      'a scope asked',
      card => ({
        ...card,
        securityRequirements: [{schemes: {signIn: {list: ['things.read', 'things.write']}}}],
      }),
    ],
    [
      'a sign-in scheme',
      card => ({...card, securitySchemes: {signIn: card.securitySchemes.signIn!}}),
    ],
    ['an input mode', card => ({...card, defaultInputModes: ['text', 'image/png']})],
    [
      'a skill',
      card => ({...card, skills: card.skills.map(skill => ({...skill, examples: ['changed']}))}),
    ],
  ])('a change of %s is a changed card', (_what, change) => {
    const card = read('python-1.0.json');
    expect(sameCard(card, change(card))).toBe(false);
  });

  test('a card saying in A2A 1.0’s shape what its 0.3 card could not say is a changed card', () => {
    const legacy = read('python-as-0.3.json');
    const current = read('python-1.0.json');
    const flows = current.securitySchemes.signIn!.scheme;
    if (flows?.$case !== 'oauth2SecurityScheme') throw new Error('the fixture’s scheme is OAuth');
    const flow = flows.value.flows!.flow;
    if (flow?.$case !== 'authorizationCode') throw new Error('the fixture’s flow is the code flow');
    const withPkce: AgentCard = {
      ...current,
      securitySchemes: {
        ...current.securitySchemes,
        signIn: {
          scheme: {
            $case: 'oauth2SecurityScheme',
            value: {
              ...flows.value,
              flows: {
                flow: {$case: 'authorizationCode', value: {...flow.value, pkceRequired: true}},
              },
            },
          },
        },
      },
    };
    expect(sameCard(legacy, current)).toBe(true);
    expect(sameCard(legacy, withPkce)).toBe(false);
  });
});
