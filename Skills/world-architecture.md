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
