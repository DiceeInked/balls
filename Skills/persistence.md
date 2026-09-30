# Persistence

The authoritative VR world should remain logically loaded even when the browser tab becomes hidden or rendering is throttled. The current browser implementation persists snapshots in origin-scoped `localStorage`; storage failures are handled without replacing the in-memory world.

Persist enough state to resume the simulation safely:
- World time
- Metaballs
- Spikes
- Glitches
- Player state, including 3D position/velocity, movement input, head state, hand state, menu state, capture state, and XP
- XP
- Positions and velocities
- Entity IDs
- Contact timers where necessary
- Metaball pickup state
- Player capture state
- Other authoritative timers
- Metaball pickup stored XP and reproduction state

Save periodically and after major state-changing events. The VR preview's R reset button intentionally clears the saved VR snapshot and creates a fresh prototype world. The current VR preview saves periodically and after major simulation changes. Page load intentionally clears the old VR snapshot and starts a fresh prototype, so visibility/unload restoration is not currently used by the preview.

When resuming, elapsed time should be handled through the simulation clock rather than blindly replaying an unbounded number of frames.

Persistence must never overwrite valid world state with a blank renderer state. Loaded snapshots are validated before they replace the current world, including entity IDs, entity types, timers, bounds, and pickup state.

## Step 9 update
Player persistence now includes the active trap state, crack center, crack points, sealed-point progress, and capture source ID. A restored capture is accepted only when the crack state has the expected finite center and point structure; malformed trap state causes the Player to resume uncaptured rather than leaving a permanently stuck capture.
