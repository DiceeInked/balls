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

A collision should be processed in a stable order. If a collision transforms, destroys, splits, or consumes an entity, later collision checks in the same simulation step must not use the invalid old object as though it still existed.

Collision state should use stable entity IDs where possible.


## Movement prototype
The current clean-slate preview uses circular hitboxes for Metaballs, Spikes, and Glitches. During this prototype phase, all three test entities use basic equal-mass circle collision resolution so movement and hitbox behavior can be validated. Later entity-specific interaction rules override this generic preview response.