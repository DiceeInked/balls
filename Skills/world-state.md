# World State

The project now has a single conceptual record of the live simulation for future VR use.

## Record shape

- `time`: timestamp of the snapshot.
- `diamond`: the future player's world position and facing direction.
- `metaballs`: an array of metaball position/radius/color records.
- `spikeBalls`: an array of spike-ball position/radius/side/rotation records.
- `camera`: current 2D camera position and zoom, useful while the VR bridge is still being developed.

The record is intentionally data-only. Rendering code should not be required to understand it.

## Coordinate system
The existing 2D simulation uses world-space X/Y coordinates. The future VR implementation can map these into an XR world, for example X/Z for the ground plane and Y for height, without changing the simulation record's meaning.

## Diamond
Until a real XR session exists, `diamond.x` and `diamond.y` mirror the current camera center. `diamond.heading` is the future facing direction and is currently zero.
