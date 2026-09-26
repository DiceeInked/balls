# VR Foundation

## Purpose
This document records the first VR-preparation layer for the Balls project. This phase does not enter WebXR or render a 3D VR scene yet. It prepares a shared world-state model that future VR code can consume.

## Naming
- `metaballs`: the moving metaball objects.
- `spikeBalls`: the moving, splitting spike-ball objects.
- `diamond`: the future VR player representation and player/world position record. Avoid using `player` as the state key so future command systems can reserve that word.

## Current bridge
The existing 2D camera is temporarily treated as the diamond's position. This gives the future VR system a stable world-space origin before a real headset pose exists.

## State transport
The main page publishes snapshots through a BroadcastChannel named `balls-world-state`. A same-origin debug page can subscribe without changing the simulation itself. A localStorage snapshot is also written as a fallback/current snapshot.

## Future work
The diamond will eventually receive its true XR position, orientation, and hand/controller state from WebXR. The VR renderer should consume the same world state instead of duplicating simulation logic.
