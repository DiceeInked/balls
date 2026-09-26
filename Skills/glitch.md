# Glitch

Glitch has two related states: the Glitch ball and Glitched substance.

## XP rules
Glitch starts with 5 XP. XP is always a non-negative integer and is rounded down after calculations.

Whenever Glitch performs a transformation, it loses one quarter of its current XP. The remaining XP is 75% of the previous XP, rounded down.

For example:
- 5 XP -> 3 XP after the first transformation.
- 3 XP -> 2 XP after the second transformation.

## Glitch ball
The Glitch ball is a simple circular hitbox. It does not need rotational physics. Its visual appearance is rapid, irregular triangular and polygonal glitch geometry around the hitbox.

The default Glitch ball value is 5 XP. Glitch XP determines the size of the visible glitchy effect.

## Meta interaction
When a Glitch ball contacts a Meta, the Meta transforms into Glitched substance. The Glitch loses one quarter of its XP as part of this transformation. The Glitch does not gain XP from this transformation.

## Glitched substance
Glitched substance can interact with Spike objects. When Glitched substance contacts a Spike, it transforms into a Spike and loses one quarter of its current XP as part of the transformation.

Glitched substance gains 1 XP whenever it collides with an edge or corner. This is cumulative.

## Visual rule
Glitched substance should look like unstable, rapidly changing triangular and polygonal fragments rather than a clean circle. Its visual size is controlled by its XP.
