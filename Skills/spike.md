# Spike

Spike is the polygonal VR object.

## Default XP
Spike starts with 16 XP. XP is always a non-negative integer and is rounded down after calculations.

## XP and shape
For Spike, XP directly determines the number of vertices. A 16-XP Spike therefore has 16 vertices.

## Meta interaction
When a Spike contacts a Meta, it rounds into a circle and becomes a Meta while retaining the Spike's original color. The resulting Meta receives half of the Spike's XP in addition to the Meta XP it is transforming into. The resulting Meta XP is rounded down.

## Glitch interaction
Glitched substance can contact a Spike and transform back into a Spike. The Glitched substance's XP is reduced by one quarter during this transformation, then the resulting integer XP determines the Spike's vertex count.
