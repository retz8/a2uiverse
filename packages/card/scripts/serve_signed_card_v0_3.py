"""Serves one agent card written for A2A 0.3, signed by a2a-sdk 0.3's own signer, and the key set
its signature names, for `capture-fixtures.mjs`.

Usage: serve_signed_card_v0_3.py <port>

The card is at /.well-known/agent-card.json and the key set at /.well-known/jwks.json, holding
the public half of es-1 (ES256), the key that signed it.
"""

import sys

import uvicorn
from cryptography.hazmat.primitives.asymmetric import ec
from jwt.algorithms import ECAlgorithm
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route

from a2a.types import (
    AgentCapabilities,
    AgentCard,
    AgentExtension,
    AgentProvider,
    AgentSkill,
)
from a2a.utils.signing import create_agent_card_signer

port = int(sys.argv[1])
base = f'http://127.0.0.1:{port}'
jku = f'{base}/.well-known/jwks.json'
key = ec.generate_private_key(ec.SECP256R1())

card = AgentCard(
    name='Fake Agent',
    description='an agent for tests',
    version='0.1.0',
    protocol_version='0.3.0',
    url=f'{base}/',
    preferred_transport='JSONRPC',
    provider=AgentProvider(organization='Acme', url='https://example.com'),
    documentation_url='https://example.com/docs',
    capabilities=AgentCapabilities(
        streaming=True,
        extensions=[
            AgentExtension(
                uri='https://a2ui.org/a2a-extension/a2ui/v0.9.1',
                params={
                    'supportedCatalogIds': [
                        'https://example.com/catalogs/fake/v1/catalog.json'
                    ]
                },
            )
        ],
    ),
    default_input_modes=['text'],
    default_output_modes=['text'],
    skills=[
        AgentSkill(
            id='fake',
            name='Fake',
            description='A fake skill',
            tags=['fake'],
            examples=['show my things'],
        )
    ],
)
signed = create_agent_card_signer(
    key, {'alg': 'ES256', 'typ': 'JOSE', 'kid': 'es-1', 'jku': jku}
)(card)
served = signed.model_dump(mode='json', by_alias=True, exclude_none=True)
jwk = {**ECAlgorithm.to_jwk(key.public_key(), as_dict=True), 'kid': 'es-1', 'alg': 'ES256'}


async def serve_card(_request):  # noqa: ANN001, ANN201
    return JSONResponse(served)


async def serve_key_set(_request):  # noqa: ANN001, ANN201
    return JSONResponse({'keys': [jwk]})


routes = [
    Route('/.well-known/agent-card.json', serve_card, methods=['GET']),
    Route('/.well-known/jwks.json', serve_key_set, methods=['GET']),
]
uvicorn.run(Starlette(routes=routes), host='127.0.0.1', port=port, log_level='warning')
