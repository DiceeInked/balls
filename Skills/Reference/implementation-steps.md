The current movement prototype checkpoint includes rendering the complete authoritative Metaball, Spike, and Glitch collections. The prototype Glitch color is exactly RGBA `#00FFC8FF`.

# VR Implementation Steps

This is the consolidated implementation order for the VR rebuild.

## 1. Clean-slate architecture
COMPLETED.

## 2. World coordinates
COMPLETED.

## 3. Simulation clock
COMPLETED for the clock layer.

## 4. Persistence
COMPLETED for the current prototype layer.

## 5. Metaballs
COMPLETED for the current prototype layer.

## 6. Spikes
COMPLETED for the current 2D simulation/rendering layer. Spikes have XP-linked polygon vertex counts, continuous Metaball draining, qualifying collision splitting/destruction, and Glitch consumption/spreading. Player capture remains deferred to the Player Trap layer.

## 7. Glitches
Implement cyan fixed-size Glitches, XP-based steering, Metaball draining, player draining, and Spike consumption/spreading.

## 8. Player
Implement the blue 3D diamond-like head, two diamond-derived thruster/control hands, XP display, left-hand menu, movement, and passive XP loss.

## 9. Player trap
Implement Spike capture, blackened world, glowing crack generation, crack points and center, point dragging, repair detection, and player release.

## 10. VR rendering
Add WebXR support, headset tracking, hand tracking, stereoscopic rendering, and optimized VR visuals.

## 11. Simulation/render separation
Ensure the simulation remains authoritative and recoverable regardless of renderer state, WebGL state, WebXR state, or tab visibility.

## 12. Debugging
Build diagnostic tools exposing authoritative world state, contacts, XP, timers, events, WebXR state, WebGL errors, and persistence state.

## 13. Testing
Test every interaction individually and in combinations.

## 14. Polish
Tune visuals, audio if later added, VR comfort, hand controls, effects, performance, and UI without changing the underlying gameplay rules.

## 15. Final architecture review
Check the implementation against every active skill and verify that no stale or removed mechanic has returned.

## Ongoing change workflow
Before every future project change, read every active skill, compare the change against the complete skill set, implement it, update affected skills, recheck for contradictions, and verify the implementation.
