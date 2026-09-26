# Collision and Transformation System

The current VR simulation uses physical collisions plus three simple transformation contacts.

## Collision detection

Moving objects keep previous and current positions. Transformation contacts use swept collision checks so fast-moving objects are much less likely to pass through one another between frames.

The common collision helper uses an object's hitRadius when present and otherwise its normal radius.

## Physical collisions

- Metas collide with world walls.
- Spikes collide with world walls and other Spikes.
- Glitches bounce from world edges.
- Spike-to-Spike physical splitting remains separate from the transformation rules.

## Transformation contacts

The three object types form a cycle:

- Meta + Spike: the Spike becomes a new Meta. The original Meta remains.
- Spike + Glitch: the Glitch becomes a new Spike. The original Spike remains.
- Glitch + Meta: the Meta becomes a new Glitch. The original Glitch remains.

The transformed object keeps the XP of the object that changed type. No XP is transferred, added, or removed by these transformations.

## XP baseline

All objects start at 16 XP. XP-driven stats use 16 XP as the default:

scale = XP / 16

At 16 XP, the scale is exactly 1x. Size, shape, and visual-effect properties that depend on XP are adjusted relative to that baseline.

## Visual-only Spike interaction

The WebGL metaball shader still includes a small Spike field influence so nearby Metas can visually bend around Spikes. This is separate from physical collision handling.
