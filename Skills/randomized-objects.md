# Object Spawning and XP Baseline

The current VR simulation initially creates:
- 3 Metas
- 3 Spikes
- 3 Glitch Balls

Their positions are randomized across the entire world. Their directions and movement speeds are randomized as well.

## XP

Every newly created object starts with 16 XP.

The old random 8-32 XP spawning system has been removed.

XP-driven stats are relative to the 16-XP baseline:

scale = XP / 16

So 16 XP always represents the object's normal/default size and XP-driven effect strength. If a future mechanic changes an object's XP, its relevant stats scale from that baseline.

## Transformations

Transformations keep the changing object's XP unchanged:
- Spike -> Meta keeps the Spike's XP.
- Meta -> Glitch keeps the Meta's XP.
- Glitch -> Spike keeps the Glitch's XP.

No transformation grants or removes XP.
