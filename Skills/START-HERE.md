# START HERE - Current Project Handoff

This is the first skill to read when joining the project fresh. It is a current handoff sheet, not a replacement for the full Skills folder. After reading this file, read every other active skill before making changes.

## Project
Repository: DiceeInked/balls
Project: Balls for Potitsitory
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
10. VR rendering: NEXT
10. VR rendering
11. Simulation/render separation
12. Debugging
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
Page refresh intentionally resumes the saved VR world from localStorage key balls-vr-world. That is expected behavior, not a reset.

The VR preview has an R button. R should mean a genuinely fresh simulation: clear saved VR state, reset world time and simulation timers, reset player XP/capture state, reset entity IDs, recreate the prototype entities, and save the fresh world.

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

## Change workflow
Before every project change:
1. Read every active skill in Skills/.
2. Compare the proposed change against the complete skill set.
3. Implement the change.
4. Update every affected skill/reference.
5. Recheck the full skill set for contradictions.
6. Verify the implementation against the updated specification.
