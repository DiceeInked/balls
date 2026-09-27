# Debugging

The project needs a debug view that exposes authoritative simulation state rather than only visual positions.

Useful debug information includes:
- World time
- Entity counts
- Entity IDs
- Entity types
- Positions
- Velocities
- Directions
- XP
- Spike vertex counts
- Glitch steering strength
- Contact pairs
- Contact timers
- XP transfers
- Metaball reproduction events
- XP pickup timers and stored XP
- Player XP and player state
- Player capture and crack progress
- WebXR support and session state
- WebGL/shader errors
- Persistence saves and resumes

Debug output should make it possible to distinguish a simulation bug from a rendering bug.

Every gameplay event that creates, destroys, transforms, splits, captures, or transfers XP should be traceable while debugging.

The debug system must not become the authoritative source of gameplay state.
