# VR Version

The VR-oriented version lives at `vr/index.html`.

## Current purpose

It is a separate destination for VR-specific mechanics and future WebXR work. It currently remains a 2D canvas application and does not start an immersive WebXR session.

The main page's `VR` button navigates to this page. The VR page includes the `D` debug control.

## Current VR mechanics

The VR page currently contains:
- three initially spawned Metas
- three initially spawned Spikes
- three initially spawned Glitch Balls
- random starting XP, speed, direction, and full-world position for the objects
- Glitch and Glitched Substance transformations
- XP-based transformations
- swept collision checks
- a red/blue chaotic Glitch visual layer
- the shared world-state publisher

## Future work

A real `Enter VR` control and WebXR session setup can be added later without making the current main page depend on WebXR.
