# Spikes

Spikes are red polygonal entities.

A Spike's vertices are tied to its XP. XP is the authoritative quantity, while the rendered polygon uses an appropriate vertex count derived from that XP.

Spikes gain XP by draining Metaballs.

Spike and Metaball interaction:
- Contact transfers 1 XP from the Metaball to the Spike immediately.
- Continuous contact transfers another 1 XP for each additional full second.
- The Spike gains the transferred XP.
- The Metaball loses the transferred XP.

Spike physical collision:
- When a Spike hits a wall, another Spike, or another qualifying collidable object, it splits into two if it has more than 3 vertices.
- The two resulting Spikes receive approximately half of the parent's vertices and XP.
- If the Spike has 3 or fewer vertices, the next qualifying collision causes it to disappear instead of producing another meaningful split.

Spike and Glitch interaction is not a bounce:
- The Glitch consumes the Spike.
- The Spike disappears.
- The existing Glitch gains half of the Spike's XP.
- The other half becomes a new Glitch.
- The new Glitch travels in a random direction.

Spike-player contact can capture the player and trigger the player trap described in the player-trap skill.


## Prototype visualization
During the movement prototype, the Spike is rendered as a red circle representing its circular physical hitbox. The final XP-linked polygonal presentation is deferred.