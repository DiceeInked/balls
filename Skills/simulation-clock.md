# Simulation Clock

The VR simulation uses elapsed world time rather than assuming that every animation frame represents the same amount of time.

Movement, contact timers, passive XP changes, pickup generation, and other time-dependent behavior must use simulation time.

Continuous XP drains follow this rule:
- The first qualifying contact transfers 1 XP immediately.
- Each additional full second of uninterrupted contact transfers another 1 XP.
- Contact timing is tracked per relevant interacting pair.

Metaball XP generation occurs every 100 seconds of simulation time for each Metaball.

The player loses 1 XP every 100 seconds of simulation time. Step 8 now consumes the Player's 100-second timer event and applies that loss in the authoritative simulation, clamped at zero.

A fixed or controlled simulation tick should be preferred for deterministic gameplay. If a browser tab is throttled or paused, catch-up must be bounded so returning to the page cannot cause an enormous physics spike.

World time should be persisted so long-running mechanics remain coherent across temporary rendering or tab interruptions.

## Current implementation status

Step 3 is implemented for the clock layer. The animation loop passes real elapsed time to the authoritative `VRWorld.step(deltaSeconds)`. The simulation uses a fixed 1/60-second update, allows at most 8 catch-up steps per frame, caps accepted frame elapsed time at 0.25 seconds, and records discarded simulation time instead of allowing an unbounded physics spike. Per-pair contact timers track uninterrupted elapsed contact and report completed one-second intervals. Each authoritative timed entity, including the player, has a reusable 100-second timer. Metaball 100-second events are now consumed by the Metaball system to generate stored pickup XP; player 100-second events remain available for the future passive XP-loss system. A small numeric tolerance prevents fixed-step floating-point drift from missing exact timer boundaries.
