# Collision and Transformation System

The current VR simulation uses both physical collisions and transformation-triggering contacts.

## Collision detection

Objects that can move quickly keep previous and current positions. Transformation contacts use a swept collision check that tests movement segments as well as current positions, reducing tunneling between frames.

The common collision helper uses `hitRadius` when an object has one and otherwise uses its normal radius.

## Physical collisions

- Metas collide only with world walls.
- Spikes collide with world walls and other Spikes.
- Glitch Balls bounce from world edges.
- Glitched Substances bounce from world edges.

Spike-to-Spike physical collisions can trigger splitting.

## Transformation contacts

- **Spike + Meta:** Spike becomes a Meta contribution. The target Meta gains half the Spike XP and takes the Spike's original color.
- **Glitch Ball + Meta:** Meta becomes Glitched Substance. The Glitch loses 25% of its XP, rounded down.
- **Glitched Substance + Spike:** Glitched Substance becomes a Spike. It loses 25% of its XP, rounded down, and that integer XP determines the resulting Spike's vertex count with a minimum of 2.

Glitched Substance does not collide with Metas.

## Visual-only Spike interaction

The WebGL metaball shader includes a small Spike field influence so nearby Metas can visually bend around Spikes. This is separate from physical collision handling and does not make an isolated Spike into a metaball.

## Object ordering

The simulation updates Meta movement, Spike physics, and VR transformations every animation frame. Removed objects are cleaned from their arrays after transformation processing.
