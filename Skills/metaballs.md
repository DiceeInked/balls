# Metaballs

Metaballs are yellow.

A Metaball has a fixed physical size. Its XP does not make the Metaball physically larger.

Metaballs can gain XP by bouncing off walls or other collidable objects. The current configurable prototype award is 1 XP per qualifying wall bounce.

Metaball and Spike interaction:
- Contact transfers 1 XP from the Metaball to the Spike immediately.
- Continuous contact transfers another 1 XP for each additional full second.
- The Spike gains the transferred XP.
- The Metaball loses the transferred XP.

Metaball and Glitch interaction:
- Contact transfers 1 XP from the Glitch to the Metaball immediately.
- Continuous contact transfers another 1 XP for each additional full second.
- The Glitch loses the transferred XP.
- The Metaball gains the transferred XP.
- If the Glitch reaches 0 XP, it dies.

Metaball reproduction:
- When a Metaball has more than 32 XP, it reproduces in the current prototype when that threshold is checked.
- A new Metaball appears at the same position.
- The new Metaball starts with 16 XP.
- The new Metaball travels in the opposite direction from the parent.
- The original Metaball loses 16 XP.

Every 100 seconds, a Metaball generates a physical XP pickup:
- Amount = floor(10% of the Metaball's current XP)
- Minimum amount = 1 XP
- The generated XP is stored in the pickup rather than immediately transferred to the player. Multiple generated amounts accumulate in the pickup's stored XP until a later collection system consumes them.

A Metaball has a bright white glowing or bloomed center. When it has stored XP waiting for pickup, a black orb appears in its center.

The player can enter the Metaball, grab the black orb, and bring it to the player's chest or head to claim all stored XP.


## Prototype visualization
During the current prototype, the Metaball remains a yellow fixed-size circle. Its XP does not affect physical size, and a generated pickup is shown as a black center orb.