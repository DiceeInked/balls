# World Coordinates

All gameplay entities use persistent world coordinates.

An entity should have a stable identity while it exists, plus the state needed to simulate it:
- ID
- Type
- Position
- Velocity
- Direction
- XP
- Relevant size or geometry
- Relevant timers
- Relevant contact state

The camera or VR headset view must not redefine world coordinates.

The VR player's physical position is separate from the headset's viewing orientation. Head and hand tracking affects the player's rendered and controlled body, but does not replace the authoritative world position.

World coordinates must remain stable when the player looks around, changes camera orientation, or moves between rendering frames.


## Step 1 implementation note
The Step 1/2 foundation stores persistent world bounds and authoritative entity collections in `VRWorld`. Stable entity IDs are allocated independently of array indexes, so rendering order cannot redefine identity. Prototype entities also store authoritative x/y positions, x/y velocities, a direction angle, speed, radius, and XP.


## Movement prototype
The preview entities now have authoritative world-space `x`, `y`, `vx`, `vy`, `direction`, `speed`, and `radius` values. Their positions are advanced from elapsed simulation time inside the simulation, independent of rendering coordinates. Resizing the display updates world bounds and clamps entities instead of resetting their world positions.