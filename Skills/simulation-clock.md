# Simulation Clock

The VR simulation uses elapsed world time rather than assuming that every animation frame represents the same amount of time.

Movement, contact timers, passive XP changes, pickup generation, and other time-dependent behavior must use simulation time.

Continuous XP drains follow this rule:
- The first qualifying contact transfers 1 XP immediately.
- Each additional full second of uninterrupted contact transfers another 1 XP.
- Contact timing is tracked per relevant interacting pair.

Metaball XP generation occurs every 100 seconds of simulation time for each Metaball.

The player loses 1 XP every 100 seconds of simulation time.

A fixed or controlled simulation tick should be preferred for deterministic gameplay. If a browser tab is throttled or paused, catch-up must be bounded so returning to the page cannot cause an enormous physics spike.

World time should be persisted so long-running mechanics remain coherent across temporary rendering or tab interruptions.

## Current implementation status

The animation loop now calculates elapsed time and passes it through `VRSimulation.step(deltaSeconds, updateFn)`. The controller advances `VRWorld.worldTime` before running the update callback. This establishes the timing boundary, but fixed-step movement, per-contact timers, bounded catch-up, and conversion of all frame-based movement to elapsed-time movement remain future work in the simulation-clock step.
