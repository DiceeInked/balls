# Glitch

Glitch has two related states: the Glitch ball and Glitched substance.

## Glitch ball
The Glitch ball is a simple circular hitbox. It does not need rotational physics. Its visual appearance is rapid, irregular triangular and polygonal glitch geometry around the hitbox.

The default Glitch ball value is 5 XP. Glitch XP determines the size of the visible glitchy effect.

## Meta interaction
When a Glitch ball contacts a Meta, the Meta transforms into Glitched substance. The Glitch ball does not gain XP from this transformation.

## Glitched substance
Glitched substance can interact with Spike objects. When Glitched substance contacts a Spike, it transforms into a Spike.

Glitched substance gains 1 XP whenever it collides with an edge, corner, or another applicable object. This is cumulative.

## Visual rule
Glitched substance should look like unstable, rapidly changing triangular and polygonal fragments rather than a clean circle. Its visual size is controlled by its XP.
