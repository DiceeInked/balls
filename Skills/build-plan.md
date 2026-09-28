# Build Plan

The VR rebuild follows this implementation order.

1. Clean-slate architecture
Establish the authoritative simulation state and keep it separate from rendering. The first layer now exists in `vr/simulation.js`, and the page has distinct simulation-update and render functions. Continue removing gameplay ownership from rendering code.

2. World coordinates
Implement stable world positions, velocities, directions, IDs, and world boundaries.

3. Simulation clock
Implement controlled simulation time, one-second contact timing, 100-second timers, and bounded catch-up.

4. Persistence
Save and restore authoritative world state and world time.

5. Metaballs
Implement yellow fixed-size Metaballs, movement, wall/collidable bouncing, XP, reproduction, and XP pickup generation.

6. Spikes
Implement red polygonal Spikes, XP-linked vertices, draining, physical splitting, and destruction at the minimum vertex state.

7. Glitches
Implement blue fixed-size Glitches, XP-based steering, Metaball draining, and Spike consumption/spreading.

8. Player
Implement the blue 3D diamond-like head and two diamond-derived thruster/control hands, XP display, menu interaction, and passive XP loss.

9. Player trap
Implement Spike capture, blackened world, crack generation, point dragging, repair detection, and release.

10. VR rendering
Add WebXR, headset tracking, hand tracking, stereoscopic rendering, and optimized visual effects.

11. Simulation/render separation
Make sure the game remains authoritative and recoverable regardless of rendering state. The current page now routes each animation frame through a simulation step before drawing; finish moving gameplay systems into the simulation module over subsequent architecture work.

12. Debugging
Build tools that expose world state, contacts, XP, timers, events, WebXR state, WebGL errors, and persistence state.

13. Testing
Test every interaction individually, then test combinations, high-speed collisions, long-running timers, reproduction, splitting, spreading, pickup collection, capture, persistence, and tab throttling.

14. Polish
Tune visuals, audio if later added, VR comfort, hand controls, effects, performance, and UI without changing the underlying rules.

15. Final architecture review
Check the implementation against every skill before calling the VR system complete.


## Visualization and movement prototype status
The VR visualization is intentionally a minimal square Canvas 2D preview. Metaball, Spike, and Glitch are all rendered as circular hitboxes using the existing project yellow/red/cyan colors. The three authoritative entities now move, bounce off the square boundaries, and resolve basic circular pair collisions. Detailed gameplay consequences and WebXR rendering remain deferred.
