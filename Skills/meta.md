# Meta

Meta is the VR version's rounded field object.

## Default XP
Meta starts with 10 XP. XP is always a non-negative integer and is rounded down after calculations.

## Spike transformation
When a Spike contacts a Meta, the Spike loses its polygonal form and becomes a Meta. Its original color is preserved. The resulting Meta gains half of the Spike's XP, with the resulting XP rounded down.

Formula: resulting Meta XP = floor(existing Meta XP + (Spike XP / 2)).

## Interactions
Meta is a field object. Its gameplay field can be used by the VR layer as a shield region.
