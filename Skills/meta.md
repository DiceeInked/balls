# Meta

Meta is the rounded field object used by the VR version.

## Starting state

Each newly created Meta starts with 16 XP.

XP is an integer. Its size and other XP-driven properties use 16 XP as the baseline:
- 16 XP = 1x the default Meta size
- lower XP scales the object down proportionally
- higher XP scales the object up proportionally

Meta movement keeps the existing randomized position, direction, and speed behavior. Speed is also scaled relative to the 16-XP baseline when XP changes.

## Shape and movement

Meta is rendered through the WebGL metaball system. It can be grabbed and dragged and physically collides with world walls.

## Spike interaction

When a Meta touches a Spike:
- the Spike becomes a new Meta
- the original Meta remains
- the new Meta keeps the Spike's XP
- the new Meta uses the Spike's color
- no XP is gained or lost

## Glitch interaction

When a Glitch touches a Meta:
- the Meta becomes a new Glitch
- the original Glitch remains
- the new Glitch keeps the Meta's XP
- no XP is gained or lost

## XP scaling

All XP-driven Meta stats are relative to the 16-XP default. Changing XP from 16 therefore scales the relevant stat by XP / 16.
