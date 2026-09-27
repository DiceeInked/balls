# XP Pickups

Each Metaball generates a physical XP pickup every 100 seconds.

The amount generated is:
floor(10% of the Metaball's current XP)

The minimum generated amount is 1 XP.

The pickup is stored physically inside the Metaball rather than immediately added to the player.

Visual behavior:
- A normal Metaball has a bright white glowing center.
- When stored XP exists, a black orb appears in the center.

Collection behavior:
- The player enters the Metaball.
- The player grabs the black orb.
- The player brings the orb to the player's chest or head.
- All XP stored in that pickup is transferred to the player.
- The pickup is then consumed.

The pickup must have its own authoritative state so rendering or hand animation cannot accidentally award XP twice.
