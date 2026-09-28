# VR Player

The VR player is blue.

The player's body is represented by:
- A 3D diamond-like head
- Two 3D diamond-derived hands

The hands act as thrusters and control surfaces for movement.

The left hand displays the player's current XP.

Looking at the left hand opens the player's menu.

The player starts with 16 XP.

The player passively loses 1 XP every 100 seconds.

Glitches drain player XP:
- 1 XP immediately on contact
- 1 additional XP for every additional full second of continuous contact

The player can be captured by Spikes.

The player should be represented as a real VR entity in the simulation, while headset orientation and hand tracking provide the input and presentation layer.

## Step 8 implementation
The authoritative Player state stores 3D position (`x`, `y`, `z`), 3D velocity, normalized movement/thrust input, head orientation state, both hand states, and left-hand gaze/menu state. The simulation consumes a normalized thrust vector through `setPlayerInput()` and applies frame-rate-independent fixed-step acceleration, damping, and a conservative maximum speed. Player movement is suspended while captured.

The Player starts at 16 XP. Every 100 seconds of simulation time, one XP is removed, clamped at zero. The existing shared contact-timer system continues to handle continuous XP loss from other entities.

The left-hand menu state is authoritative: the input layer reports whether the player is looking toward the left hand, and the simulation mirrors that condition into `menuOpen`. Final tracked-pose interpretation and 3D presentation are deferred to the WebXR layer.
