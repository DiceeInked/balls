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
- Glitch -> Player

The direction of transfer matters:
- Spike drains Metaball.
- Metaball drains Glitch.
- Glitch drains Player.

Drain timers should be stored per relevant contact pair rather than as one global timer.

Collision detection should prevent a rapidly moving object from repeatedly triggering the immediate-contact transfer every frame.
