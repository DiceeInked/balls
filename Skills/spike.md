# Spike

Spike is the polygonal object used by the VR gameplay rules.

## Starting XP and shape

Each newly created Spike starts with 16 XP.

XP directly determines the number of vertices, so the default Spike has 16 vertices. Spike size is also relative to the 16-XP baseline:
- 16 XP = 1x the default Spike size
- lower XP scales it down proportionally
- higher XP scales it up proportionally

## Motion

Spikes retain randomized position, direction, and speed at creation. Their XP-scaled movement uses 16 XP as the baseline.

Spike-to-Spike physical collisions and the existing split behavior remain separate from the three transformation rules.

## Meta interaction

When a Spike touches a Meta:
- the Spike becomes a new Meta
- the original Meta remains
- the new Meta keeps the Spike's XP
- the new Meta takes the Spike's color
- no XP is gained or lost

## Glitch interaction

When a Spike touches a Glitch:
- the Glitch becomes a new Spike
- the original Spike remains
- the new Spike keeps the Glitch's XP
- no XP is gained or lost

## XP scaling

All XP-driven Spike stats are relative to the 16-XP default. Vertex count remains equal to integer XP.
