# Meta

Meta is the rounded field object used by the VR version.

## Starting state

Each initially spawned Meta receives:
- a random integer XP from 8 through 32
- a random speed
- a random direction
- a random position across the full world

The current speed randomization range is 0.75 through 2.8 world units per frame.

Meta XP is stored as an integer. Later transformations can change it outside the starting 8-32 range.

## Shape and movement

Meta is rendered through the WebGL metaball system. Its radius is influenced by its XP and is adjusted when its XP changes.

Metas move with wall-only physical collision behavior and can be grabbed and dragged.

## Spike interaction

When a Spike contacts a Meta, the Spike is removed and the Meta absorbs half of the Spike's XP:

`new Meta XP = floor(existing Meta XP + Spike XP / 2)`

The Meta takes on the Spike's original color. The Spike's polygonal form is therefore converted into a rounded Meta.

## Glitch interaction

When a Glitch Ball contacts a Meta, the Meta is removed and converted into Glitched Substance. The resulting Glitched Substance starts at the Meta's position and velocity.

Meta has no separate physical-collision response with Glitch. Contact is the transformation trigger.
