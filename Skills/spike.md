# Spike

Spike is the polygonal object used by the VR gameplay rules.

## Starting XP and shape

A newly spawned Spike starts with a random integer XP from 8 through 32. XP directly determines the number of vertices, so an 8-XP Spike has 8 vertices and a 32-XP Spike has 32 vertices.

XP is stored as an integer. Transformations can move a Spike outside the normal starting range.

## Motion

Each newly spawned Spike receives a random speed and direction and is positioned randomly across the full world. The same randomization rules are used for newly created split children.

## Meta interaction

When a Spike contacts a Meta:
- the Spike is removed
- the Meta becomes rounded as usual
- the Meta takes the Spike's original color
- the Meta gains half the Spike's XP, rounded down after the addition

Formula:

`floor(existing Meta XP + Spike XP / 2)`

This is a gameplay transformation, not a normal physical Spike-Meta bounce.

## Glitched Substance interaction

When a Glitched Substance contacts a Spike, the Glitched Substance transforms that Spike into its resulting Spike state.

The Glitched Substance loses one quarter of its current XP, rounded down. The resulting integer XP becomes the Spike's vertex count, with a minimum of 2 vertices.

## Rendering

Spikes with 3 or more vertices render as filled polygons with an outline. A 2-vertex Spike renders as a rotating line.
