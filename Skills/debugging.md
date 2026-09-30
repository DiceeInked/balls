# Debugging

The project needs a debug view that exposes authoritative simulation state rather than only visual positions.

Useful debug information includes:
- World time
- Entity counts
- Entity IDs
- Entity types
- Positions
- Velocities
- Directions
- XP
- Spike vertex counts
- Glitch steering strength
- Contact pairs
- Contact timers
- XP transfers
- Metaball reproduction events
- XP pickup timers and stored XP
- Player XP and player state
- Player movement input and velocity
- Player head and hand state
- Player left-hand gaze/menu state
- Player capture and crack progress
- WebXR support and session state
- WebGL/shader errors
- Persistence saves and resumes
- Persistence validation failures
- Metaball pickup stored XP and reproduction
- Whether the WebGL/XR renderer is active
- Whether the Canvas 2D desktop preview is running
- WebXR availability and the last XR startup error

Debug output should make it possible to distinguish a simulation bug from a rendering bug.

Every gameplay event that creates, destroys, transforms, splits, captures, or transfers XP should be traceable while debugging. Step 4/5 state should additionally expose persistence status, stored pickup XP, and reproduction events.

The debug system must not become the authoritative source of gameplay state.

## Step 1 implementation note

The debug view should expose entity counts and types, including the Glitch collection, so a missing rendered Glitch can be distinguished from a missing simulation entity.
The Step 1/2 foundation exposes a dedicated `VRWorld` state container suitable for authoritative debugging, including world time, entity registry, player state, bounds, stable IDs, positions, velocities, directions, and prototype collections. Debug views must continue to read this state rather than become owners of it.

The page now has separate simulation and rendering entry points. If WebGL is unavailable or its program cannot be used, a 2D fallback is attempted instead of continuing into invalid WebGL calls. The preview also measures the fixed stage rather than relying on a mobile canvas's transient client size, and it waits for a nonzero layout before initializing entities. Device-level visual verification is still required to confirm behavior on iPhone Safari.
The Canvas preview also normalizes 8-digit RGBA hex colors before drawing, so a valid authoritative entity that is present in the simulation is not mistaken for a missing entity solely because the browser rejects that color syntax.
## Step 9 update
Debugging should expose whether the Player is captured, the trap source Spike ID, crack point count, sealed-point count, crack center, and current crack-point positions.

## XR/WebGL failure retention
The immersive renderer retains the most recent XR startup or frame error after session end. It also validates that the XR layer supplied a framebuffer with a nonzero size and reports a WebGL error code when a rendered XR frame leaves the context in an error state. The live XR frame count and pose timestamp can be used to distinguish an advancing WebXR session from a stalled presentation, while the 2D preview remains a separate visible view of the same authoritative simulation.

## Recent XR hardening
The immersive renderer now preserves separate diagnostics for XR-frame setup, XR input/simulation, XR rendering, and WebGL errors. XR input and diagnostic failures are caught independently from the final render path, so the renderer can continue displaying the last valid authoritative state. The desktop page exposes the most recent retained VR renderer error after leaving immersive mode. XR framebuffer existence and eye viewport dimensions are validated each frame.


## Diagnostic codes and failure containment
The page keeps a rolling diagnostic history rather than only one free-form error string. Simulation failures use the `SIM-*` family; page-loop failures use `PAGE-LOOP-*`; XR failures use `XR-*`; and WebGL failures use `GL-*`. Each entry records its stage, and XR entries also retain the frame/time context available to the renderer. The status panel shows the most recent errors so a black or frozen headset view can be separated into startup, pose, framebuffer, rendering, input, simulation, or WebGL categories.

A fixed-step simulation exception is caught at the simulation boundary, the simulation is halted, and the current state is left available for inspection. The page animation loop itself is also protected from an unexpected runtime exception.


## XR scene-probe diagnostics
The immersive renderer includes a fixed diagnostic probe and start gate that are not derived from simulation entities. If these visible markers render, the WebXR framebuffer, camera matrices, shader pipeline, and basic world-space geometry path are functioning even when the gameplay scene is empty. The diagnostics panel also reports the number of rendered gameplay objects.

XR input diagnostics distinguish `inputSourceCount` from `trackedInputCount`. A zero source count produces the warning `XR-INPUT-EMPTY-001`; sources with no usable pose produce `XR-INPUT-POSE-EMPTY-001`. Viewer translation and rotation are tracked independently so a session can be identified as frame-advancing but pose-static.

The start gate uses the event frame supplied by `XRInputSourceEvent` to obtain the target-ray pose and perform an actual button hit check. This follows the WebXR input event model documented by MDN.


## Step 12 authoritative debug snapshot
The simulation now provides a read-only `getDebugSnapshot()` view for debugging. It contains world time, accumulator and dropped simulation time, bounds, complete entity summaries with IDs/types/positions/velocities/directions/XP/radii/timers/removal state, Player movement/head/hand/menu/capture/trap state, active contact timers, pending 100-second timer events, persistence state, retained simulation errors, and the rolling gameplay event trace. The snapshot is derived from authoritative state and never owns gameplay state.

The event trace records entity creation/destruction, XP transfers, wall-bounce XP gain, Metaball reproduction, pickup generation, Player passive XP drain, Spike splitting/destruction, Spike consumption by Glitches, Player capture, and Player release. It is bounded to the most recent 64 events so diagnostics cannot grow without limit.

The VR page exposes the read-only inspection surface as `window.VRDebug.getSnapshot()`, along with separate simulation and renderer diagnostic accessors. The visible status panel reports active contact-timer, pending-timer, and event counts.

## WebGL invalid-value tracing
The renderer pins the `aPosition` vertex attribute to location 0 before program linking, eliminating device-dependent attribute-location assignment for the only vertex attribute. WebGL calls for attribute setup, viewport setup, and drawing are instrumented so `0x501` can be associated with the exact operation rather than reported only as a raw hexadecimal error.


## Step 13 test mode
`vr/index.html?test=1` loads the isolated `vr/tests.js` harness and reports the authoritative simulation test results in the page status panel. Test instances are separate `VRWorldState` objects, so the test suite cannot become the live simulation source of truth.