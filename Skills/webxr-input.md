# WebXR Input

The VR player uses WebXR headset and hand/controller input.

The headset provides viewing orientation and position.

The two hands provide tracked input and are represented visually as diamond-derived hands.

Hands act as thrusters and control surfaces. Input processing should be translated into authoritative player movement rather than directly teleporting the rendered model.

The left hand has two special functions:
- It displays player XP.
- Looking toward it opens the player menu.

The input layer must handle session start, session end, lost input sources, and temporarily unavailable tracking without corrupting the simulation.

Input should be frame-rate independent wherever it affects gameplay.

## Step 8 simulation boundary
The input layer supplies normalized thrust, head orientation, both hand states, and whether the player is looking toward the left hand through the authoritative Player input boundary. The simulation owns movement, velocity, and menu state. WebXR session/pose acquisition and final hand-pose mapping remain renderer/input-layer work for Step 10.
