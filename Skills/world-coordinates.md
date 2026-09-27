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
