# Build Plan

The VR rebuild follows this implementation order.

1. Clean-slate architecture
COMPLETED for the current prototype.

2. World coordinates
COMPLETED for the current prototype.

3. Simulation clock
COMPLETED for the clock layer.

4. Persistence
COMPLETED.

5. Metaballs
COMPLETED for the current prototype layer.

6. Spikes
COMPLETED for the current 2D simulation/rendering layer. Spikes now use XP-linked polygon vertices, drain Metaballs through continuous contact timers, split on qualifying physical impacts, disappear at the minimum vertex state, and are consumed by Glitches according to the documented split rule. Player capture remains part of the later Player Trap layer.

7. Glitches
COMPLETED for the current 2D simulation/rendering layer. Glitches now have fixed size, XP-based steering toward the current target, continuous Metaball interaction, continuous controlled-entity interaction, zero-XP removal, and Spike consumption/spreading.

8. Player
COMPLETED for the authoritative simulation layer. The Player now owns XP, 3D position/velocity state, normalized movement/thrust input, head state, both hand state, left-hand gaze/menu state, and passive 100-second XP loss. Detailed WebXR pose wiring and final 3D rendering remain part of later steps.

9. Player trap
COMPLETED for the authoritative simulation and current 2D preview. Spike capture, blackened world, glowing crack generation, crack points and center, point dragging, repair detection, and player release are implemented. Detailed WebXR presentation remains part of Step 10.

10. VR rendering
Add WebXR support, headset tracking, hand tracking, stereoscopic rendering, and optimized VR visuals.

11. Simulation/render separation
Ensure the simulation remains authoritative and recoverable regardless of renderer state, WebGL state, WebXR state, or tab visibility.

12. Debugging
Build diagnostic tools exposing authoritative world state, contacts, XP, timers, events, WebXR state, WebGL errors, and persistence state.

13. Testing
Test every interaction individually and in combinations, including high-speed collisions, simultaneous contacts, entity destruction order, long-running timers, reproduction, Spike splitting, Glitch spreading, pickup collection, player capture, persistence, tab throttling, and mobile rendering fallback.

14. Polish
Tune visuals, audio if later added, VR comfort, hand controls, effects, performance, and UI without changing the underlying rules.

15. Final architecture review
Check the implementation against every active skill before calling the VR system complete.

## Ongoing change workflow

Before every future project change:
1. Read every active skill in `Skills/`.
2. Compare the proposed change against the complete skill set.
3. Implement the change.
4. Update every affected skill.
5. Recheck the full skill set for contradictions.
6. Verify the implementation against the updated specification.
