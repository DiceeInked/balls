# Spike Ball Physics

This document covers the physical Spike Ball simulation shared by the current pages.

## Starting state

The initial VR page spawns three Spike Balls across the full world. Each one receives:
- random integer XP from 8 through 32
- a vertex count equal to its XP
- a random speed
- a random direction
- a random position
- random rotation

The current speed randomization range is 0.75 through 2.8 world units per frame.

## Splitting

A wall collision or Spike-to-Spike collision can split a Spike into two smaller Spike Balls.

A split child no longer inherits a fixed vertex count or movement direction. Each child receives fresh randomized XP from 8 through 32, fresh randomized speed and direction, and a smaller radius. XP again determines its vertex count.

A Spike with 2 vertices is drawn as a rotating line. Another qualifying split removes it and emits particles.

The total number of Spike Balls is capped at 64.

## Physical collisions

- Spike Balls collide with world walls.
- Spike Balls collide physically with other Spike Balls.
- Spike Balls do not physically collide with Metas.
- Spike-to-Meta contact is handled by the VR transformation system.
- Glitched Substance-to-Spike contact is handled by the VR transformation system.

Spike collision uses circular/circumscribed radii rather than exact polygon geometry. A short collision cooldown helps prevent immediate repeat splitting.

## Motion and rendering

Spike Balls have linear velocity, rotation, and angular velocity. Wall impacts reflect velocity components and modify angular velocity. Spike-to-Spike impacts resolve separating motion and add a small rotational impulse.

The Spike overlay is drawn on a transparent 2D canvas above the WebGL metaball canvas and follows the same camera and zoom.
