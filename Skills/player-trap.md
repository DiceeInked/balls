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

## Step 9 implementation
The authoritative simulation now captures the Player on Spike contact. Capture clears Player velocity and movement input and creates a 12-point crack around a central target in Player world space. Active left or right hand positions can drag nearby crack points toward the center. Points seal when they reach the configurable repair distance, and when all points are sealed the Player is released and the trap state is cleared.

Current prototype values are centralized in vr/simulation.js: 12 crack points, 90-unit initial crack radius, 34-unit hand reach, and 18-unit repair distance. The crack state is persisted with the Player so a capture cannot disappear merely because the page is refreshed.


## Immersive 3D presentation
In immersive VR, the trap is a red three-dimensional reality crack rather than a circular or radial diagram. Each crack branch is an irregular, angular 3D fissure that ends at a tiny red orb. The orb is the visual target the Player moves toward the center while repairing the trap. Sealed endpoints collapse into the center and their branch disappears. When the final endpoint is repaired and authoritative capture ends, the remaining visible fissure performs a short inward reconstruction/healing animation before disappearing completely. The visual animation is presentation-only; capture and repair remain authoritative simulation state.
