"""a2uiverse-sdk — the agent-facing projection of the A2UIVerse app contract."""

from .composition import (
    COMPOSITION_EXTENSION_URI,
    SLOT_ARCHETYPES,
    SlotRequest,
    read_slot_request,
)

__all__ = [
    "COMPOSITION_EXTENSION_URI",
    "SLOT_ARCHETYPES",
    "SlotRequest",
    "read_slot_request",
]
