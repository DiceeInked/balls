# World State

The project publishes a single data-only snapshot of the live simulation for diagnostics and future VR use.

## Transport

`state.js` exposes `window.WorldStateBridge`.

Snapshots are broadcast through the `balls-world-state` BroadcastChannel. A localStorage snapshot named `balls-world-state` is also written at most once every 250 ms as a fallback/current snapshot.

The bridge does not own simulation logic or rendering.

## Record shape

Each snapshot contains:

- `time`: timestamp.
- `diamond`: `x`, `y`, and `heading`.
- `metaballs`: objects containing `id`, `x`, `y`, `radius`, `color`, `xp`, `vx`, and `vy`.
- `spikeBalls`: objects containing `id`, `x`, `y`, `radius`, `sides`, `xp`, `rotation`, `vx`, `vy`, and `angularVelocity`.
- `glitchBalls`: objects containing `id`, `x`, `y`, `radius`, `xp`, and `glitched`.
- `glitchedSubstances`: objects containing `id`, `x`, `y`, `radius`, and `xp`.
- `camera`: `x`, `y`, `zoom`, `worldWidth`, and `worldHeight`.

The state is intentionally plain data. Rendering code is not required to understand it.

## Coordinates

The simulation uses world-space X/Y coordinates. A future 3D VR renderer can map those coordinates into its own scene convention without changing the meaning of the 2D simulation record.

Until a real XR session exists, `diamond.x` and `diamond.y` mirror the camera center and `diamond.heading` remains zero.
