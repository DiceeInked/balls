# Object Interactions

The current interaction matrix is:

Metaball + wall:
- Physical bounce
- Metaball gains 1 XP in the current prototype

Metaball + qualifying collidable object:
- Physical response
- Metaball gains XP when that object is implemented as a qualifying collider

Metaball + Metaball:
- No special XP transfer rule

Metaball + Spike:
- Spike drains Metaball
- Immediate 1 XP transfer
- Then 1 XP per additional full second of continuous contact
- Contact resets when the entities separate

Metaball + Glitch:
- Metaball drains Glitch
- Immediate 1 XP transfer
- Then 1 XP per additional full second
- Glitch dies at 0 XP

Spike + wall / Spike / qualifying collidable:
- Split into two when above the minimum vertex threshold
- Otherwise disappear
- Current Spike point count is derived from XP with 3 minimum, 32 maximum, and 1 extra point per 4 XP

Glitch + Spike:
- No bounce
- Spike disappears
- Half Spike XP goes to existing Glitch
- Other half creates a new Glitch moving randomly
- New Glitch is clamped to world bounds

Glitch + player:
- Glitch drains player XP
- Immediate 1 XP, then 1 XP per additional full second

Spike + player:
- Player is captured and enters the trap state in the later Player Trap step

Any interaction not defined here must not invent a new gameplay rule without an explicit project decision.
