# Glitches

Glitches are blue entities with a fixed physical size.

XP does not change a Glitch's physical size. XP controls its steering strength and curvature toward a target.

Glitch steering behavior is designed around these reference points:
- 16 XP: essentially no useful target steering
- 32 XP: slight curve toward a target
- 64 XP: useful curve toward a target
- 128 XP: extremely strong steering, approaching immediate curvature
- 128 XP is the practical steering cap

Glitches spread primarily by consuming Spikes.

Glitch and Metaball interaction:
- The Metaball steals 1 XP from the Glitch immediately on contact.
- Continuous contact transfers another 1 XP every additional full second.
- The Metaball gains the transferred XP.
- The Glitch loses the transferred XP.
- A Glitch reaching 0 XP dies.

Glitch and Spike interaction:
- The Glitch does not bounce.
- The Spike disappears.
- The existing Glitch gains half the Spike's XP.
- The other half creates a new Glitch.
- The new Glitch travels in a random direction.

Glitches also drain player XP according to the shared XP-drain rules.

Glitches should have a visually chaotic, glitch-like presentation rather than a smooth orb-like appearance. During the movement prototype they are intentionally rendered as blue/cyan circles so their physical hitbox is easy to inspect. The final visual effect must not be mistaken for their physical hitbox.
The movement prototype renders Glitches as blue/cyan circles so the physical hitbox is easy to inspect. The authoritative prototype color is exactly RGBA `#00FFC8FF`.
