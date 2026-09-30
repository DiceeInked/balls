# START HERE - Current Project Handoff

This is the first skill to read when joining the project fresh. It is a current handoff sheet, not a replacement for the full Skills folder. After reading this file, read every other active skill before making changes.

## Project
Repository: DiceeInked/balls
Project: Balls for Potitsitory
Hosting: GitHub Pages. This repository is not hosted or deployed on Vercel.
Current work: rebuilding the VR version from a clean-slate authoritative simulation.
Authoritative simulation: vr/simulation.js
Current preview: vr/index.html

## Current progress
1. Clean-slate architecture: COMPLETED
2. World coordinates: COMPLETED
3. Simulation clock: COMPLETED
4. Persistence: COMPLETED
5. Metaballs: COMPLETED for current prototype
6. Spikes: COMPLETED for current 2D prototype
7. Glitches: COMPLETED for current 2D prototype
8. Player: COMPLETED for the authoritative simulation layer
9. Player trap: COMPLETED
10. VR rendering: IMPLEMENTED with a real Three.js 3D/WebXR scene, device verification pending
11. Simulation/render separation: COMPLETED
12. Debugging: COMPLETED for the current prototype
13. Testing
14. Polish
15. Final architecture review

## Step 8 checkpoint
The authoritative Player now starts with 16 XP and owns persistent 3D position/velocity state, normalized movement/thrust input, head state, both hand states, left-hand gaze/menu state, and a 100-second passive XP timer. Fixed-step movement applies acceleration, damping, and a conservative speed cap, and movement pauses while captured. Every 100 seconds, the Player loses 1 XP, clamped at zero.

## Step 7 checkpoint
Glitches use #00FFC8FF, fixed size, and XP-based steering toward the player. 16 XP gives no useful steering, 32 slight, 64 useful, and 128 extremely strong steering with 128 as the practical cap.

Metaball contact drains 1 XP from the Glitch immediately and 1 more per additional full second. A Glitch reaching 0 XP is removed.

Glitch contact drains 1 XP from the Player immediately and 1 more per additional full second. The Glitch receives the transferred XP.

Glitch/Spike contact consumes the Spike without a bounce. Half its XP goes to the existing Glitch and the other half creates a new Glitch with a random direction, clamped to bounds.

## Persistence and reset
Page load intentionally starts a fresh prototype world. Any stale localStorage snapshot under the balls-vr-world key is cleared before the first simulation frame, so a runaway or corrupted world cannot survive a refresh.

The VR preview has an R button. R means a genuinely fresh simulation: clear saved VR state, reset world time and simulation timers, reset player XP/capture state, reset entity IDs, and recreate the prototype entities. Page load performs the same fresh-world reset automatically.

## Current architecture
Simulation is authoritative. Rendering is only a view.
XP is integer-only.
Use stable entity IDs.
Keep physical collisions, interaction contacts, XP drains, and transformations separate.
Continuous drains use per-pair contact timers.
Removed entities must be finalized before later processing.
Randomness is gameplay variety, not authoritative state.
Do not resurrect removed mechanics.

## Current files
vr/simulation.js: authoritative simulation, persistence, collisions, XP, entities.
vr/index.html: 2D preview and reset control.
state.js: shared legacy world-state bridge.
Skills/: living project specification.
Skills/Reference/: reference copies of the mechanics summary and implementation order.

## Verification checkpoint
Simulation syntax has been tested.

Step 8 implementation has been committed and the affected Skills documentation and verification matrix have been updated.
Glitch steering has been tested at 16, 32, 64, and 128 XP.
Metaball/Glitch immediate and one-second drains have been tested.
Glitch zero-XP removal has been tested.
Player/Glitch transfer direction has been tested.
Spike consumption and random child spawning have been tested.
Spike removal/finalization and persistence round trips have been tested.
The VR Spike split now follows the working original prototype's smaller 55%-radius children, perpendicular separation, ±0.24 directional fan-out, and 8-frame collision cooldown. The split regression was checked against the updated rules.
Player Trap capture, 12-point crack creation, trap persistence, repair/release, captured movement lock, and malformed snapshot rejection have been smoke-tested.
The current VR simulation, desktop preview, legacy state bridge, and Step 10 renderer are source-level complete. The desktop preview no longer depends on WebXR availability, remains live while immersive XR is active, the immersive environment follows the deferred visual specification in Skills/vr-rendering.md, the VR button remains usable for diagnostics on ordinary computers, and actual immersive WebXR device verification remains pending.

## Change workflow
Before every project change:
1. Read every active skill in Skills/.
2. Compare the proposed change against the complete skill set.
3. Implement the change.
4. Update every affected skill/reference.
5. Recheck the full skill set for contradictions.
6. Verify the implementation against the updated specification.


## Recent XR coordinate and diagnostics hardening
The immersive renderer now treats `local-floor` Y=0 as the game floor and converts simulation X/Y/Z into one consistent XR coordinate system, including Player-relative vertical movement. The current XR reference floor and preview grid follow the authoritative Player position instead of using a fixed hidden offset; future visual-floor requirements are documented separately in Skills/vr-rendering.md.

Runtime diagnostics now keep structured error codes for simulation, XR startup/session, XR pose/input/rendering, WebGL context loss, and WebGL error states. The bottom status panel displays simulation health, entity counts, XR frame/view/input counts, and the most recent retained errors. A simulation exception is contained and marks the authoritative simulation halted instead of killing the page animation loop.


## Recent XR black-screen hardening
The immersive frame path now declares and validates the XR base layer before reading its framebuffer dimensions. This avoids a frame-level reference error that could prevent any world rendering while leaving the session itself apparently active.

The Player now starts at the center of the authoritative arena. Immersive VR opens with a visible start gate and a fixed diagnostic probe independent of simulation entities. The simulation remains paused until the start button is selected with an XR primary action or squeeze action. The gate is targeted through the XR input ray rather than accepting arbitrary button presses.

Diagnostics now distinguish no input sources from input sources with no tracked pose, report viewer translation and rotation motion, report framebuffer dimensions, count rendered objects, and count selection/squeeze events.


## Hosting and deployment
The live project is served through GitHub Pages. Vercel is not the deployment target for DiceeInked/balls and should not be used to judge whether a change has reached the live site.

## Rendering architecture reset
The immersive renderer was replaced with a clean Three.js-based 3D pipeline. Three.js WebGLRenderer owns WebXR presentation, stereoscopic cameras, XR frame timing, and the XR framebuffer path. The game still keeps vr/simulation.js authoritative, but immersive rendering is no longer built from the previous hand-written raw WebGL shader/framebuffer system. Detailed future visual requirements are recorded in Skills/vr-rendering.md and are not yet implemented.
