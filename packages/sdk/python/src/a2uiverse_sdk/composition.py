"""The composition extension (SPEC §14), agent-facing half.

The normative definition is ``packages/sdk/contracts/composition.v0.1.json``;
``tests/test_composition_contract.py`` asserts this projection against it. The
TypeScript projection (``packages/sdk/js``, npm ``@a2uiverse/sdk``) carries the
platform-facing half (composition stamp, surface-id namespacing).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

#: The A2A extension URI the composition contract is keyed by.
COMPOSITION_EXTENSION_URI = "https://a2uiverse.dev/ext/composition/v0.1"

#: The shapes an agent can be asked to paint for (SPEC §4.4).
SLOT_ARCHETYPES = ("card", "panel", "row", "full")


@dataclass(frozen=True)
class SlotRequest:
    """Orchestrator → agent: paint for this slot shape, within this budget.

    ``archetype`` is one of :data:`SLOT_ARCHETYPES` in the current contract
    version; an unknown value should be tolerated (treat as no hint) so a newer
    orchestrator composes with an older agent. The budget's unit is
    task-internal (SPEC §4.4).
    """

    archetype: str
    budget: str

    def to_metadata(self) -> dict[str, dict[str, str]]:
        """The request as A2A message metadata, keyed by the extension URI."""
        return {
            COMPOSITION_EXTENSION_URI: {
                "archetype": self.archetype,
                "budget": self.budget,
            }
        }


def read_slot_request(metadata: Mapping[str, Any] | None) -> SlotRequest | None:
    """The slot request on a message's metadata, or ``None`` if absent/malformed."""
    if not metadata:
        return None
    raw = metadata.get(COMPOSITION_EXTENSION_URI)
    if not isinstance(raw, Mapping):
        return None
    archetype = raw.get("archetype")
    budget = raw.get("budget")
    if not isinstance(archetype, str) or not isinstance(budget, str):
        return None
    return SlotRequest(archetype=archetype, budget=budget)
