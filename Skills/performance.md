# Performance

Quest-class VR hardware is a primary performance target.

The simulation and renderer should be designed to avoid unnecessary per-frame allocations and expensive work.

Important goals:
- Separate simulation from rendering
- Use efficient entity collections
- Reuse geometry and materials where practical
- Keep particle counts bounded
- Avoid unbounded crack, glitch, or collision effects
- Use broad-phase collision filtering before expensive checks when entity counts grow
- Use swept collision only where needed
- Keep simulation catch-up bounded after tab throttling
- Avoid repeatedly rebuilding large GPU resources
- Keep WebGL uniforms and shader complexity within conservative limits
- Avoid creating large temporary arrays every frame
- Reuse objects for visual effects where practical
- Keep a lightweight 2D fallback for devices where WebGL is unavailable

Performance optimization must never silently change gameplay rules.

## Current architecture note

The animation loop now calls the authoritative simulation step before rendering. Prototype entity creation, movement, bounds handling, and collision response are no longer duplicated in `vr/index.html`. The preview reuses an active-entity scratch array, caches normalized draw colors, avoids repeated layout reads during normal frames, and uses bounded fixed-step catch-up so a throttled browser cannot demand unbounded physics work. The fallback remains a basic visibility layer, not the eventual immersive WebXR renderer.


## Movement prototype
The current preview performs a small all-pairs circular collision pass over only the active prototype entities. The simulation reuses its active-entity array, while broad-phase filtering remains appropriate once the authoritative entity count grows.