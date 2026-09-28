# Collision System

Collision detection is divided conceptually into:
- Physical collisions
- Interaction contacts
- XP-drain contacts
- Transformation or consumption contacts

Fast-moving objects require swept or continuous-aware collision checks so they cannot simply tunnel through another entity between frames.

Physical collision examples:
- Metaball with walls or qualifying collidable objects
- Spike with walls, Spikes, or qualifying collidable objects

Interaction examples:
- Spike draining a Metaball
- Metaball draining a Glitch
- Glitch draining the player
- Glitch consuming a Spike
- Spike capturing the player

Collision responses must be resolved according to the entity interaction rules rather than applying one generic bounce response to every object.

Step 7 expands the entity-specific interaction pass. Metaball/Glitch contact uses the authoritative per-pair timer for continuous XP transfer. The controlled-entity/Glitch contact uses the same timer, with the resource moving into the Glitch. Generic physical separation is skipped for Metaball/Glitch; the controlled-entity interaction is handled as a gameplay contact rather than a circular bounce.

A collision should be processed in a stable order. If a collision transforms, destroys, splits, or consumes an entity, later collision checks in the same simulation step must not use the invalid old object as though it still existed.

Collision state should use stable entity IDs where possible.

## Movement prototype

The current clean-slate preview uses circular physical hitboxes for Metaballs, Spikes, and Glitches. The authoritative simulation owns movement, wall handling, entity-specific Spike interactions, and basic equal-mass circle collision resolution. Later entity-specific interaction rules override the generic preview response.

## Step 9 update
Spike-player contact is now an authoritative capture interaction. It captures the Player, clears Player movement for the duration of the trap, and creates the persisted crack state. The generic physical collision response is not applied to the Player during capture.
