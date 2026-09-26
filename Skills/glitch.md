# Glitch

Glitch has two related states in the VR version: a moving Glitch Ball and a Glitched Substance.

## Starting state

Each initially spawned Glitch Ball receives:
- a random integer XP from 8 through 32
- a random speed
- a random direction
- a random position across the full world

The current speed randomization range is 0.75 through 2.8 world units per frame.

XP is always stored as an integer. The 8-32 range is the starting range, not a permanent upper/lower bound after transformations.

## Glitch Ball

The Glitch Ball has a circular hitbox and no rotational physics. Its visible effect is intentionally chaotic: rapidly changing horizontal noise slices, blocks, jagged shards, displacement bars, and red/blue fragments.

Its XP controls the size and density of the glitch effect.

Glitch Balls can be grabbed and dragged. While being dragged, their normal movement is paused.

## Meta interaction

When a Glitch Ball contacts a Meta, that Meta is removed and becomes a Glitched Substance at the Meta's position and velocity.

The Glitch Ball loses one quarter of its current XP for the transformation:

`new XP = floor(old XP * 0.75)`

The Glitch gains no XP from this transformation and remains present in its transformed/glitched state.

## Glitched Substance

Glitched Substance:
- moves with velocity
- can be grabbed and dragged
- bounces from world edges
- gains 1 XP for each edge/corner impact
- grows as its XP increases
- can transform into a Spike when it contacts one
- does not collide with Metas

When it transforms into a Spike, it loses one quarter of its current XP, rounded down. The resulting integer XP becomes the Spike's vertex count, with a minimum of 2 vertices.

Swept collision checks are used so fast-moving objects are much less likely to pass through one another between frames.
