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
- Player survival state
- Player-capture state
- World time

Simulation and rendering should remain separate enough that gameplay can be tested without relying on visual effects.

The regular 2D experience and the VR experience may share concepts and data formats, but the VR mechanics described by these skills are authoritative for the VR version.

Every code change must be checked against every skill in this folder. If a new rule conflicts with an older skill, the newest explicit project rule wins and the affected skills must be updated together.

## Step 1 implementation notes

A world-state container exists in `vr/simulation.js`; the VR page uses its entity collections rather than renderer-owned gameplay arrays. The container also holds authoritative player state, world bounds, world time, and entity identity allocation.

The page now routes each animation frame through a `VRSimulation.step()` boundary. That step advances world time and invokes gameplay updates before a separate `renderFrame()` draws the result. This is an architectural seam, not yet a complete migration of every gameplay system out of `vr/index.html`. Movement is still largely frame-based until the simulation-clock step.

The page also has a 2D fallback renderer for browsers where WebGL context creation fails or the shader program cannot be used. Rendering failure must not stop the simulation or leave the page entirely blank when the fallback canvas is available.


## Minimal visualization status
The visualization is currently a deliberately simple view of the architecture. It does not implement detailed gameplay rendering or WebXR yet. The three basic object shapes are only visual placeholders.
