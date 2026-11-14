"""A scratch agent on Python's a2a-sdk 0.3 that serves an extended card, for
`capture-extended-cards.mjs`.

Usage: serve_extended_card_v0_3.py <port> <grpc port>

Its card, written for A2A 0.3, lists JSON-RPC at `/` and gRPC on its gRPC port, and says it
serves an extended card. Asked for it, a2a-sdk 0.3 answers on JSON-RPC with the extended card, the
public card with one skill more, and on gRPC with the public card (`_dev/a2a-findings.md` 22).
"""

import asyncio
import sys

import grpc
import uvicorn

from a2a.grpc import a2a_pb2_grpc
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.apps import A2AStarletteApplication
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler, GrpcHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill

port = int(sys.argv[1])
grpc_port = int(sys.argv[2])
base = f'http://127.0.0.1:{port}'


def card_with(skills: list[AgentSkill]) -> AgentCard:
    return AgentCard(
        name='Scratch Shop',
        description='A scratch shop on a2a-sdk 0.3',
        version='0.1.0',
        protocol_version='0.3.0',
        url=f'{base}/',
        preferred_transport='JSONRPC',
        additional_interfaces=[AgentInterface(url=f'127.0.0.1:{grpc_port}', transport='GRPC')],
        capabilities=AgentCapabilities(streaming=True),
        supports_authenticated_extended_card=True,
        default_input_modes=['text'],
        default_output_modes=['text'],
        skills=skills,
    )


SHOP = AgentSkill(id='shop', name='Shop', description='The front page', tags=['shop'])
LANTERNS = AgentSkill(
    id='lanterns', name='Lantern repairs', description='Your lantern repairs', tags=['lanterns']
)
card = card_with([SHOP])
extended = card_with([SHOP, LANTERNS])


class Idle(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        return None

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        return None


handler = DefaultRequestHandler(agent_executor=Idle(), task_store=InMemoryTaskStore())
app = A2AStarletteApplication(agent_card=card, http_handler=handler, extended_agent_card=extended)


async def main() -> None:
    server = grpc.aio.server()
    a2a_pb2_grpc.add_A2AServiceServicer_to_server(GrpcHandler(card, handler), server)
    server.add_insecure_port(f'127.0.0.1:{grpc_port}')
    await server.start()
    config = uvicorn.Config(app.build(), host='127.0.0.1', port=port, log_level='warning')
    await uvicorn.Server(config).serve()


asyncio.run(main())
