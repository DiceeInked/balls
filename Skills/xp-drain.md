# XP Drain

Continuous XP drain uses a shared contact-timer model.

For a qualifying pair:
1. The first valid contact transfers 1 XP immediately.
2. The same uninterrupted contact transfers another 1 XP after each additional full second.
3. If contact ends, the continuous timer resets.
4. A new contact begins with a new immediate 1 XP transfer.

Current qualifying drains:
- Metaball -> Spike
- Glitch -> Metaball
- Player -> Glitch

The arrow denotes the XP source followed by the XP destination.

The direction of transfer matters:
- Spike drains Metaball: Metaball -> Spike.
- Metaball drains Glitch: Glitch -> Metaball.
- Glitch drains Player: Player -> Glitch.

Drain timers are stored per relevant contact pair rather than as one global timer.

Collision detection must prevent a rapidly moving object from repeatedly triggering the immediate-contact transfer every frame.

Step 7 implements Glitch -> Metaball and Player -> Glitch with the authoritative per-pair timer. A Glitch reaching 0 XP from a Metaball drain is removed.