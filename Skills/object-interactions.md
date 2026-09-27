# Object Interactions

The current interaction matrix is:

Metaball + wall:
- Physical bounce
- Metaball gains XP
- Exact XP gain remains configurable

Metaball + qualifying collidable object:
- Physical response
- Metaball gains XP
- Exact XP gain remains configurable

Metaball + Metaball:
- No special XP transfer rule

Metaball + Spike:
- Spike drains Metaball
- Immediate 1 XP transfer
- Then 1 XP per additional full second of continuous contact

Metaball + Glitch:
- Metaball drains Glitch
- Immediate 1 XP transfer
- Then 1 XP per additional full second
- Glitch dies at 0 XP

Spike + wall / Spike / qualifying collidable:
- Split into two when above the minimum vertex threshold
- Otherwise disappear

Glitch + Spike:
- No bounce
- Spike disappears
- Half Spike XP goes to existing Glitch
- Other half creates a new Glitch moving randomly

Glitch + player:
- Glitch drains player XP
- Immediate 1 XP, then 1 XP per additional full second

Spike + player:
- Player is captured and enters the trap state

Any interaction not defined here must not invent a new gameplay rule without an explicit project decision.
