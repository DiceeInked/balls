# Player Trap

A qualifying Spike collision can freeze or capture the VR player.

During capture:
- The world becomes black.
- Glowing cracks appear in front of the player.
- The crack consists of many points and has a central target point.
- The player must find the center.
- The player drags the crack points toward the center.
- The crack is repaired when its points are sufficiently sealed to the center.
- Successful repair frees the player.

The exact number of crack points, required distance threshold, timing, and other balancing values remain configurable until explicitly decided.

The trap is gameplay state, not merely a visual effect. Capture, crack progress, and release state must exist in the authoritative simulation.
