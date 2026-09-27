# Persistence

The authoritative VR world should remain logically loaded even when the browser tab becomes hidden or rendering is throttled.

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

Save periodically and after major state-changing events.

When resuming, elapsed time should be handled through the simulation clock rather than blindly replaying an unbounded number of frames.

Persistence must never overwrite valid world state with a blank renderer state.
