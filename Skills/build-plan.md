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
IMPLEMENTED with a real Three.js 3D/WebXR pipeline. Three.js owns XR presentation, the stereo camera, the XR render loop, and the underlying framebuffer path. The scene contains genuine 3D meshes, materials, lighting, floor/grid geometry, controller/hand visuals, a fixed start gate, and trap rendering. Actual device verification remains pending.

11. Simulation/render separation
COMPLETED for the current architecture. The simulation remains authoritative and advances independently of rendering. XR input is an explicit input boundary, while XR pose/diagnostic failures are isolated from rendering so the last valid authoritative state can still be displayed.

12. Debugging
COMPLETED for the current prototype. The simulation now exposes a read-only authoritative debug snapshot containing entity state, contact timers, pending timer events, Player/trap state, persistence state, diagnostics, and a rolling gameplay event trace. The page also exposes this snapshot through `window.VRDebug` and reports live contact/timer/event counts in the status panel.

13. Testing
IN PROGRESS. The deterministic authoritative simulation harness in `vr/tests.js` passes 19/19 tests covering core mechanics, persistence, timers, Player trap, fixed-step throttling, and debug isolation. A `?test=1` preview mode runs the suite in-browser. Actual WebXR headset/browser, iPhone Safari, mobile fallback, and Quest-class performance checks remain device-dependent and are not claimed complete.

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


## Current Step 11/12 hardening
The renderer/simulation boundary now contains runtime failures instead of allowing a fixed-step or page-loop exception to kill diagnostics. The immersive renderer records structured XR/WebGL error codes and exposes live frame, view, input, reference-space, and framebuffer diagnostics. Coordinate mapping has been normalized around the Player and `local-floor` where available.


## Step 12 diagnostic hardening update
The current VR preview has structured runtime diagnostics, a fixed XR scene probe, an immersive start gate, explicit no-input warnings, pose translation/rotation reporting, framebuffer reporting, and simulation exception containment. Step 11 remains the architectural goal of keeping simulation ownership independent from rendering, with the current page's XR start gate enforcing that separation at startup.


## Hosting
The project is deployed through GitHub Pages. Deployment state must be checked through GitHub Pages/GitHub rather than Vercel.
