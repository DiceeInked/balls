# Glitches

Glitches have a fixed invisible spherical collision volume and are visually represented by chaotic red and blue 2D fragments around that volume. The fragments are roughly 50% transparent, continuously appear/disappear, teleport, resize, and remain viewer-facing, producing a smoke/cloud-like glitch effect rather than a visible sphere.

XP does not change a Glitch's physical size. XP controls its steering strength and curvature toward its current target, the player in the current prototype.

Reference steering behavior:
- 16 XP: essentially no useful target steering
- 32 XP: slight curve toward the player
- 64 XP: useful curve toward the player
- 128 XP: extremely strong steering, approaching immediate curvature
- 128 XP is the practical steering cap

The current steering strength is 0 at 16 XP, then scales toward full strength at 128 XP. The steering rate is frame-rate independent because it is applied from the fixed simulation timestep.

Glitches spread primarily by consuming Spikes.

Glitch and Metaball interaction:
- The Metaball steals 1 XP from the Glitch immediately on contact.
- Continuous contact transfers another 1 XP every additional full second.
- The Metaball gains the transferred XP.
- The Glitch loses the transferred XP.
- A Glitch reaching 0 XP is removed from the authoritative world.

Glitch and Spike interaction:
- The Glitch does not bounce.
- The Spike disappears.
- The existing Glitch gains half the Spike's XP.
- The other half creates a new Glitch.
- The new Glitch travels in a random direction and is clamped to world bounds.

Glitch and player interaction:
- The Glitch drains 1 XP from the player immediately on contact.
- Continuous contact transfers another 1 XP every additional full second.
- The Glitch receives the transferred XP.
- The player loses the transferred XP.
- The contact is not a generic physical bounce.

The visible glitch fragments must not draw a definite circular outline. They only communicate the approximate location and extent of the invisible spherical hitbox. The visible effect must never replace or redefine the authoritative collision volume.

The authoritative prototype color is exactly RGBA #00FFC8FF.