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
- Player movement input and velocity
- Player head and hand state
- Player left-hand gaze/menu state
- Player capture and crack progress
- WebXR support and session state
- WebGL/shader errors
- Persistence saves and resumes
- Persistence validation failures
- Metaball pickup stored XP and reproduction
- Whether the WebGL/XR renderer is active
- Whether the Canvas 2D desktop preview is running
- WebXR availability and the last XR startup error

Debug output should make it possible to distinguish a simulation bug from a rendering bug.

Every gameplay event that creates, destroys, transforms, splits, captures, or transfers XP should be traceable while debugging. Step 4/5 state should additionally expose persistence status, stored pickup XP, and reproduction events.

The debug system must not become the authoritative source of gameplay state.

## Step 1 implementation note

The debug view should expose entity counts and types, including the Glitch collection, so a missing rendered Glitch can be distinguished from a missing simulation entity.
The Step 1/2 foundation exposes a dedicated `VRWorld` state container suitable for authoritative debugging, including world time, entity registry, player state, bounds, stable IDs, positions, velocities, directions, and prototype collections. Debug views must continue to read this state rather than become owners of it.

The page now has separate simulation and rendering entry points. If WebGL is unavailable or its program cannot be used, a 2D fallback is attempted instead of continuing into invalid WebGL calls. The preview also measures the fixed stage rather than relying on a mobile canvas's transient client size, and it waits for a nonzero layout before initializing entities. Device-level visual verification is still required to confirm behavior on iPhone Safari.
The Canvas preview also normalizes 8-digit RGBA hex colors before drawing, so a valid authoritative entity that is present in the simulation is not mistaken for a missing entity solely because the browser rejects that color syntax.
## Step 9 update
Debugging should expose whether the Player is captured, the trap source Spike ID, crack point count, sealed-point count, crack center, and current crack-point positions.

## XR/WebGL failure retention
The immersive renderer retains the most recent XR startup or frame error after session end. It also validates that the XR layer supplied a framebuffer with a nonzero size and reports a WebGL error code when a rendered XR frame leaves the context in an error state.
