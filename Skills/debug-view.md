# Debug View

The debug view is a separate same-origin diagnostic page at `debug.html`.

## Access

The main page has a `D` button in the top-right corner. The VR page also has a `D` button. Each opens the debug page in a separate tab.

## Live data

The debug page subscribes to the `balls-world-state` BroadcastChannel and also reads the latest localStorage snapshot.

It displays:
- diamond position and heading
- camera position and zoom
- every Meta position, radius, color, XP, and velocity
- every Spike position, radius, vertex count, XP, rotation, velocity, and angular velocity
- every Glitch Ball position, radius, XP, and transformed/glitched state
- every Glitched Substance position, radius, and XP
- the complete raw world-state record

The page is diagnostic only. It does not run or modify the simulation.
