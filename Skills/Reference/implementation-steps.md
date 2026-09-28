The current movement prototype checkpoint includes rendering the complete authoritative Metaball, Spike, and Glitch collections. The prototype Glitch color is exactly RGBA `#00FFC8FF`.
# VR Implementation Steps

This is the consolidated implementation order for the VR rebuild.

## 1. Clean-slate architecture
Establish the authoritative simulation state and keep it separate from rendering. `vr/simulation.js` now owns the world-state container, prototype entity lifecycle, identity, bounds, movement, velocity, direction, and collision processing. `vr/index.html` measures the stage and renders the authoritative state. The detailed gameplay systems are still deferred.

## 2. World coordinates
Implement stable world positions, velocities, directions, entity IDs, and world boundaries. The prototype now stores x/y positions, x/y velocities, a direction angle, speed, stable IDs, radii, and persistent bounds in the simulation.

## 3. Simulation clock
Implement controlled simulation time, continuous-contact timing, 100-second timers, and bounded catch-up after browser throttling.

## 4. Persistence
Save and restore authoritative world state and world time, including entities, player state, XP, relevant timers, pickup state, and capture state.

## 5. Metaballs
Implement yellow fixed-size Metaballs, movement, wall/collidable bouncing, configurable XP gain, reproduction, and physical XP pickup generation.

## 6. Spikes
Implement red polygonal Spikes, XP-linked vertex counts, Metaball draining, physical splitting, low-vertex destruction, and player capture.

## 7. Glitches
Implement red fixed-size Glitches, XP-based steering, Metaball draining, player draining, and Spike consumption/spreading.

## 8. Player
Implement the blue 3D diamond-like head, two diamond-derived thruster/control hands, XP display, left-hand menu, movement, and passive XP loss.

## 9. Player trap
Implement Spike capture, blackened world, glowing crack generation, crack points and center, point dragging, repair detection, and player release.

## 10. VR rendering
Add WebXR support, headset tracking, hand tracking, stereoscopic rendering, and optimized VR visuals.

## 11. Simulation/render separation
Ensure the simulation remains authoritative and recoverable regardless of renderer state, WebGL state, WebXR state, or tab visibility. A lightweight 2D fallback now exists for missing WebGL, but the architecture work is not complete.

## 12. Debugging
Build diagnostic tools exposing authoritative world state, contacts, XP, timers, events, WebXR state, WebGL errors, and persistence state.

## 13. Testing
Test every interaction individually and in combinations, including high-speed collisions, simultaneous contacts, entity destruction order, long-running timers, reproduction, Spike splitting, Glitch spreading, pickup collection, player capture, persistence, tab throttling, and mobile rendering fallback.

## 14. Polish
Tune visuals, audio if later added, VR comfort, hand controls, effects, performance, and UI without changing the underlying gameplay rules.

## 15. Final architecture review
Check the implementation against every active skill and verify that no stale or removed mechanic has returned.

## Ongoing change workflow

Before every future project change:
1. Read every active skill in `Skills/`.
2. Compare the proposed change against the complete skill set.
3. Implement the change.
4. Update every affected skill.
5. Recheck the full skill set for contradictions.
6. Verify the implementation against the updated specification.

The active skills remain authoritative. These reference steps provide the broader roadmap and should be used alongside the skills, not instead of them.


## Visualization reset checkpoint
Before continuing detailed VR rendering, the page should first remain a simple reliable Canvas 2D preview with the three basic object shapes. Once that smoke test is reliable, detailed WebXR rendering can be rebuilt from the clean foundation.


## Current movement prototype checkpoint
The minimal VR page now uses circular hitbox visuals for Metaball, Spike, and Glitch. Their authoritative positions and velocities are updated in `vr/simulation.js`, with square-boundary bouncing and basic circular collision response. The next work should build on this verified movement foundation rather than restoring the removed detailed renderer. Steps 1 and 2 are complete at the prototype level; the next planned layer is the simulation clock. The Canvas preview converts configured 8-digit RGBA hex colors to Canvas-compatible `rgba(...)` strings at draw time.