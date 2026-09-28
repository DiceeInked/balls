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

Destroy:
- Mark the entity for removal.
- Ensure no later system in the same simulation step treats it as active.

Collect:
- XP pickups are consumed exactly once.
- The stored XP is transferred before the pickup is removed.

Lifecycle operations should be centralized enough to prevent duplicate entities, double XP transfers, stale collision references, or destroyed objects continuing to move.


## Step 1 implementation note
The Step 1/2 foundation uses `VRWorld.allocateEntityId()`, `register()`, `unregister()`, `collectionFor()`, and `resetPrototypeEntities()` for authoritative entity identity and lifecycle bookkeeping. Step 3 adds authoritative contact-timer and 100-second timer state to the world. Steps 4 and 5 add validated persistence plus Metaball pickup and reproduction lifecycle state. The page no longer creates or resets gameplay entities directly. Rendering reads the authoritative collections, so a resize cannot silently recreate the world.
