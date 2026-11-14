"""Serves serve_card.py's `jsonrpc` card signed by a2a-sdk 1.x's own signer, told eleven ways,
and the key set its signatures name, for `capture-fixtures.mjs`.

Usage: serve_signed_card.py <port>

Each variant's card is at /<variant>/agent-card.json, the key set at /.well-known/jwks.json, on
one origin. The key set holds the public halves of three keys: es-1 (ES256), rs-1 (RS256) and
ed-1 (EdDSA). Variants:
  es256          one signature by es-1
  rs256          one signature by rs-1
  eddsa          one signature by ed-1
  rotated        a signature by es-0, a key no longer in the key set, then one by es-1
  typ-jwt        one signature by es-1, its typ "JWT"
  no-typ         one signature by es-1 whose protected header names no typ
  no-jku         one signature by es-1 whose protected header names no jku
  unprotected    one signature by es-1 whose kid and jku are in the unprotected header alone
  other-origin   one signature by es-1 whose jku is on another port
  hs256          one signature by a shared secret, HS256
  as-0.3         serve_card.py's `both` card signed by es-1, then put in A2A 0.3's shape by
                 a2a-sdk's own conversion
"""

import sys

import uvicorn
from cryptography.hazmat.primitives.asymmetric import ec, ed25519, rsa
from jwt.algorithms import ECAlgorithm, OKPAlgorithm, RSAAlgorithm
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route

from a2a.compat.v0_3.conversions import to_compat_agent_card
from a2a.server.routes import create_agent_card_routes
from a2a.utils.signing import create_agent_card_signer
from serve_card import card_for

port = int(sys.argv[1])
base = f'http://127.0.0.1:{port}'
jku = f'{base}/.well-known/jwks.json'

keys = {
    'es-0': (ec.generate_private_key(ec.SECP256R1()), ECAlgorithm, 'ES256'),
    'es-1': (ec.generate_private_key(ec.SECP256R1()), ECAlgorithm, 'ES256'),
    'rs-1': (rsa.generate_private_key(public_exponent=65537, key_size=2048), RSAAlgorithm, 'RS256'),
    'ed-1': (ed25519.Ed25519PrivateKey.generate(), OKPAlgorithm, 'EdDSA'),
}


def public_jwk(kid: str) -> dict:
    private, algorithm, alg = keys[kid]
    jwk = algorithm.to_jwk(private.public_key(), as_dict=True)
    return {**jwk, 'kid': kid, 'alg': alg, 'use': 'sig'}


def signed(*signers, interfaces: str = 'jsonrpc'):  # noqa: ANN002, ANN201
    card = card_for(port, interfaces)
    for signer in signers:
        card = signer(card)
    return card


def by(kid: str, **protected):  # noqa: ANN003, ANN201
    private, _, alg = keys[kid]
    header = {'alg': alg, 'typ': 'JOSE', 'kid': kid, 'jku': jku, **protected}
    return create_agent_card_signer(private, {k: v for k, v in header.items() if v is not None})


variants = {
    'es256': signed(by('es-1')),
    'rs256': signed(by('rs-1')),
    'eddsa': signed(by('ed-1')),
    'rotated': signed(by('es-0'), by('es-1')),
    'typ-jwt': signed(by('es-1', typ='JWT')),
    # PyJWT writes typ "JWT" unless the header sets typ to None, which removes it.
    'no-typ': signed(
        create_agent_card_signer(
            keys['es-1'][0], {'alg': 'ES256', 'typ': None, 'kid': 'es-1', 'jku': jku}
        )
    ),
    'no-jku': signed(by('es-1', jku=None)),
    'unprotected': signed(
        create_agent_card_signer(
            keys['es-1'][0], {'alg': 'ES256', 'typ': 'JOSE'}, {'kid': 'es-1', 'jku': jku}
        )
    ),
    'other-origin': signed(
        by('es-1', jku=f'http://127.0.0.1:{port + 1}/.well-known/jwks.json')
    ),
    'hs256': signed(
        create_agent_card_signer(
            'a shared secret of thirty-two bytes!',
            {'alg': 'HS256', 'typ': 'JOSE', 'kid': 'hs-1', 'jku': jku},
        )
    ),
}

routes = [
    route
    for name, card in variants.items()
    for route in create_agent_card_routes(card, card_url=f'/{name}/agent-card.json')
]
# The conversion needs a 0.3 interface: serve_card.py's `both` card, signed in its 1.0 form.
compat = to_compat_agent_card(signed(by('es-1'), interfaces='both')).model_dump(exclude_none=True)


async def serve_compat(_request):  # noqa: ANN001, ANN201
    return JSONResponse(compat)


async def serve_key_set(_request):  # noqa: ANN001, ANN201
    return JSONResponse({'keys': [public_jwk(kid) for kid in ('es-1', 'rs-1', 'ed-1')]})


routes.append(Route('/as-0.3/agent-card.json', serve_compat, methods=['GET']))
routes.append(Route('/.well-known/jwks.json', serve_key_set, methods=['GET']))

uvicorn.run(Starlette(routes=routes), host='127.0.0.1', port=port, log_level='warning')
