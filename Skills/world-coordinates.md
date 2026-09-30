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

The Player also maintains authoritative `vx`, `vy`, and `vz` velocity plus normalized movement/thrust input. The renderer or WebXR input layer supplies control state; the simulation advances the Player's position from that state.

World coordinates must remain stable when the player looks around, changes camera orientation, or moves between rendering frames.


## Step 1 implementation note
The Step 1/2 foundation stores persistent world bounds and authoritative entity collections in `VRWorld`. Stable entity IDs are allocated independently of array indexes, so rendering order cannot redefine identity. Prototype entities also store authoritative x/y positions, x/y velocities, a direction angle, speed, radius, and XP.


## Movement prototype
The preview entities now have authoritative world-space `x`, `y`, `vx`, `vy`, `direction`, `speed`, and `radius` values. Their positions are advanced from elapsed simulation time inside the simulation, independent of rendering coordinates. Resizing the display updates world bounds and clamps entities instead of resetting their world positions.

## XR mapping
The immersive renderer uses one explicit 3D mapping: simulation X maps to scene X, simulation Y maps to scene negative Z, and simulation Z maps to scene Y. Entity positions are kept in authoritative world coordinates, then the Player-relative world root applies the virtual locomotion offset before the meter scale is displayed. The game floor is authoritative world Z=0, so its XR height is derived from Player Z rather than from a hard-coded camera-height offset.

The XR reference space controls headset height/orientation, not the game's world origin. Looking around therefore changes only the supplied XR view matrices; it does not redefine simulation coordinates.


## XR start-gate coordinate anchor
The immersive diagnostic probe and start button are fixed in XR reference-space coordinates rather than simulation coordinates. This is intentional: they test the XR camera and GPU path independently of Player-relative gameplay transforms. Gameplay entities continue to use the authoritative Player-relative mapping of simulation X → XR X, simulation Y → XR -Z, and simulation Z → XR Y.
