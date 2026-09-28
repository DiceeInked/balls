# Persistence

The authoritative VR world should remain logically loaded even when the browser tab becomes hidden or rendering is throttled. The current browser implementation persists snapshots in origin-scoped `localStorage`; storage failures are handled without replacing the in-memory world.

Persist enough state to resume the simulation safely:
- World time
- Metaballs
- Spikes
- Glitches
- Player state
- XP
- Positions and velocities
- Entity IDs
- Contact timers where necessary
- Metaball pickup state
- Player capture state
- Other authoritative timers
- Metaball pickup stored XP and reproduction state

Save periodically and after major state-changing events. The VR preview's R reset button intentionally clears the saved VR snapshot and creates a fresh prototype world. The preview saves on a short world-time interval and on major Metaball events, and also attempts a save when the page is hidden or unloaded.

When resuming, elapsed time should be handled through the simulation clock rather than blindly replaying an unbounded number of frames.

Persistence must never overwrite valid world state with a blank renderer state. Loaded snapshots are validated before they replace the current world, including entity IDs, entity types, timers, bounds, and pickup state.
