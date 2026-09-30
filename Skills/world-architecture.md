# World Architecture

The VR version is a clean-slate simulation built around one authoritative world state.

The simulation is the source of truth. Rendering is only a view of that state. A rendering failure, WebGL failure, WebXR failure, or tab visibility change must never silently reset or redefine the world.

The authoritative world contains:
- Metaballs
- Spikes
- Glitches
- The VR player
- World boundaries and other collidable geometry
- Positions, velocities, directions, and movement state
- XP and entity-specific stats
- Contact and drain timers
- Metaball XP-pickup timers and stored pickup state
- Player survival state, XP, movement input, velocity, head state, hand state, and menu state
- Player-capture state
- World time
- Validated persistence state and Metaball pickup state

Simulation and rendering should remain separate enough that gameplay can be tested without relying on visual effects.

The regular 2D experience and the VR experience may share concepts and data formats, but the VR mechanics described by these skills are authoritative for the VR version.

Every code change must be checked against every skill in this folder. If a new rule conflicts with an older skill, the newest explicit project rule wins and the affected skills must be updated together.

## Step 1 implementation notes

A world-state container exists in `vr/simulation.js`; the VR page uses its entity collections rather than renderer-owned gameplay arrays. The container also owns prototype entity creation/reset, player state, world bounds, world time, entity identity allocation, velocity, direction, movement, and collision processing.

The page now routes each animation frame through the authoritative `VRWorld.step()` boundary. That step advances fixed simulation time and performs prototype movement and collision processing before rendering. Prototype entity lifecycle and movement ownership have been removed from `vr/index.html`; the clock layer now also owns the simulation accumulator, bounded catch-up, contact timers, and 100-second timer events.

The page also has a 2D fallback renderer for browsers where WebGL context creation fails or the shader program cannot be used. Rendering failure must not stop the simulation or leave the page entirely blank when the fallback canvas is available.

## Minimal visualization status
The visualization is currently a deliberately simple view of the architecture. It does not implement detailed gameplay rendering or WebXR yet. The three objects are circular movement prototypes backed by authoritative entity state. The preview derives its logical bounds from the fixed stage and waits for valid nonzero layout dimensions before initialization, so transient mobile canvas sizing cannot redefine or erase the world. They are intentionally simple and do not yet implement their final gameplay-specific interaction consequences.

## Step 9 implementation note
Player capture and crack-repair progress are now authoritative Player state. The renderer may visualize the blackened world and cracks, but it does not own capture or repair state.

## Recent XR hardening
The Step 11 separation work has been advanced in the XR frame path: XR framebuffer presentation is no longer dependent on successful input or simulation updates. Input/simulation failures are recorded and rendering continues from the last valid authoritative state. The desktop Canvas 2D preview also remains on the same authoritative simulation clock while immersive XR is active, so entering VR does not freeze the preview or require a second simulation owner.


## XR rendering robustness update
The immersive renderer now uses a single Player-relative world transform for all gameplay geometry, with `local-floor` Y=0 as the virtual floor and simulation Z as vertical world position. The floor, grid, entities, and Player visual therefore share one spatial model.

The renderer uses an XR depth buffer for deterministic 3D occlusion. Runtime failures are diagnostic events only: simulation state is not reset because of a renderer error, and a simulation exception is contained at the fixed-step boundary for later inspection.


## XR startup isolation
Immersive session startup now has a presentation-only start gate. The authoritative simulation does not advance while the gate is active. A fixed diagnostic probe is rendered independently of authoritative entities, allowing XR rendering to be tested before gameplay state is allowed to change. Selecting the gate changes only the page's startup state; gameplay remains owned by `VRWorld`.
