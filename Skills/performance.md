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

Performance optimization must never silently change gameplay rules.
