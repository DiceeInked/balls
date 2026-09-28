# Spikes

Spikes are red polygonal entities. Their physical size is fixed, while their rendered vertex count is derived from XP.

The current prototype maps Spike XP to vertices as:
- 3 minimum vertices
- +1 vertex per 4 XP
- 32 maximum vertices

Spikes gain XP by draining Metaballs.

Spike and Metaball interaction:
- Contact transfers 1 XP from the Metaball to the Spike immediately.
- Continuous contact transfers another 1 XP for each additional full second.
- The Spike gains the transferred XP.
- The Metaball loses the transferred XP.
- The contact timer resets when contact ends.

Spike physical collision:
- When a Spike hits a wall, another Spike, or another qualifying collidable object, it splits into two if it has more than 3 vertices.
- The two resulting Spikes receive approximately half of the parent's XP and use their inherited XP to determine their vertex counts.
- Their directions separate from the parent's direction.
- If the Spike has 3 or fewer vertices, the qualifying collision destroys it instead of producing another split.

Glitch and Spike interaction is not a bounce:
- The Glitch consumes the Spike.
- The Spike disappears.
- The existing Glitch receives half of the Spike's XP.
- The other half becomes a new Glitch.
- The new Glitch travels in a random direction.
- The new Glitch is clamped to the world bounds.

Spike-player contact can capture the player and trigger the player trap described in the player-trap skill. Player capture is implemented in the later Player/Player Trap steps.

## Current prototype visualization

The Canvas preview renders Spikes as XP-linked polygons rather than circular placeholder graphics. The physical hitbox remains circular until the later 3D collision/rendering work.
