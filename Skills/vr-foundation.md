# VR Foundation

The project has a separate VR-oriented simulation page, but it is not yet a WebXR headset application. The current foundation keeps the simulation's world data available to future VR code.

## Naming

- `metaballs`: moving rounded field objects.
- `spikeBalls`: moving, splitting polygonal objects.
- `glitchBalls`: moving Glitch objects.
- `glitchedSubstances`: transformed Glitch states created from Metas.
- `diamond`: the future VR player/world-origin record.

## Shared state

The main page and VR page use `state.js` to publish world snapshots through the `balls-world-state` BroadcastChannel. A localStorage snapshot is maintained as a fallback/current snapshot.

The simulation remains responsible for object behavior. The state bridge only transports data and does not render the world.

## Current diamond behavior

There is no headset pose yet. The current 2D camera center is temporarily published as the diamond's world position, with heading set to zero.

## Future direction

A later WebXR layer can replace the temporary diamond position/orientation with real headset and controller tracking while continuing to consume the shared world-state model.
