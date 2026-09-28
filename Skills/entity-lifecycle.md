# Entity Lifecycle

Every entity has a clear lifecycle.

Spawn:
- Create a stable ID.
- Initialize required state.
- Add it to the authoritative simulation.

Update:
- Advance movement and timers.
- Process contacts and gameplay rules.
- Consume 100-second Metaball timer events into authoritative pickup state.

Transform:
- If a rule changes an entity's type, replace or mutate it deliberately.
- Transfer XP exactly according to the rule.
- Preserve or reset other properties only when explicitly specified.

Split:
- Create child entities with stable IDs.
- Divide XP and relevant geometry according to the split rule.
- Mark the parent removed before later collision systems can reuse it.

Destroy:
- Mark the entity for removal.
- Ensure no later system in the same simulation step treats it as active.

Collect:
- XP pickups are consumed exactly once.
- The stored XP is transferred before the pickup is removed.

Step 6 adds Spike splitting and Spike consumption lifecycle rules. Spike children receive new stable IDs through the authoritative register path. A Spike consumed by a Glitch is marked removed, while the newly created Glitch receives a stable ID and randomized direction.

Lifecycle operations should be centralized enough to prevent duplicate entities, double XP transfers, stale collision references, or destroyed objects continuing to move.
