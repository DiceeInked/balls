# Randomized Object Spawning

The current VR simulation randomizes the initial state of every object class.

## Initial objects

The VR page initially creates:
- 3 Metas
- 3 Spikes
- 3 Glitch Balls

Their positions are randomized across the entire world rather than only inside the current camera view.

## XP

Every newly spawned object starts with a random integer XP from 8 through 32, inclusive.

XP remains integer-valued. Transformation mechanics can later increase or decrease XP, so an object's later XP is not guaranteed to remain in the starting range.

## Motion

Every newly spawned object receives a random speed between 0.75 and 2.8 world units per frame and a random direction.

New Spike children created by splitting also receive fresh random XP, speed, and direction.

## Transformation exception

A transformed object does not necessarily receive a new random movement state. For example:
- a Meta becoming Glitched Substance starts from the Meta's position and velocity
- a Spike becoming Meta changes the existing Meta's XP/color state
- a Glitched Substance becoming Spike reuses the collision target Spike's object and updates its XP/shape

Randomization therefore describes spawn behavior, not every transformation event.
