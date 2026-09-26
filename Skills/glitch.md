# Glitch

Glitch is the chaotic red-and-blue object used by the VR gameplay rules.

## Starting state

Each newly created Glitch starts with 16 XP.

Its size and visual effect use 16 XP as the baseline:
- 16 XP = 1x the default Glitch size/effect scale
- lower XP scales the relevant effect down proportionally
- higher XP scales it up proportionally

Glitch movement keeps randomized position, direction, and speed, with XP-driven movement stats relative to the 16-XP baseline.

## Shape and movement

The Glitch has a circular hitbox and no rotational physics. Its visible effect uses rapidly changing horizontal noise slices, blocks, jagged shards, displacement bars, and red/blue fragments.

Glitches can be grabbed and dragged.

## Meta interaction

When a Glitch touches a Meta:
- the Meta becomes a new Glitch
- the original Glitch remains
- the new Glitch keeps the Meta's XP
- no XP is gained or lost

## Spike interaction

When a Glitch touches a Spike:
- the Glitch becomes a new Spike
- the original Spike remains
- the new Spike keeps the Glitch's XP
- no XP is gained or lost

## XP scaling

All XP-driven Glitch stats use the same baseline rule:

scale = XP / 16

At 16 XP, the scale is exactly 1x.
