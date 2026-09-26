# Debug View

The debug view is a separate same-origin page used to inspect the live world-state bridge.

## Access
The main page has a `D` button in the top-right corner. It opens `debug.html` in a separate tab.

## Live data
The debug page listens to the `balls-world-state` BroadcastChannel and displays:
- diamond position and heading
- camera position and zoom
- every metaball position/radius
- every spike-ball position/radius/sides/rotation
- update timestamp and object counts

This is deliberately a diagnostic view, not the final VR UI.
