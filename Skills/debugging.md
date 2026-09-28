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
- Whether the WebGL renderer or 2D fallback is active

Debug output should make it possible to distinguish a simulation bug from a rendering bug.

Every gameplay event that creates, destroys, transforms, splits, captures, or transfers XP should be traceable while debugging.

The debug system must not become the authoritative source of gameplay state.

## Step 1 implementation note

The Step 1 foundation exposes a dedicated `VRWorld` state container suitable for authoritative debugging, including world time, entity registry, player state, and bounds. Debug views must continue to read this state rather than become owners of it.

The page now has separate simulation and rendering entry points. If WebGL is unavailable or its program cannot be used, a 2D fallback is attempted instead of continuing into invalid WebGL calls. The preview also measures the fixed stage rather than relying on a mobile canvas's transient client size, and it waits for a nonzero layout before initializing entities. Device-level visual verification is still required to confirm behavior on iPhone Safari.
