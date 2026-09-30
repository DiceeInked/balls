# WebXR Input

The VR player uses WebXR headset and hand/controller input.

The headset provides viewing orientation and position.

The two hands provide tracked input and are represented visually as diamond-derived hands.

Hands act as thrusters and control surfaces. Input processing should be translated into authoritative player movement rather than directly teleporting the rendered model.

The left hand has two special functions:
- It displays player XP.
- Looking toward it opens the player menu.

The input layer must handle session start, session end, lost input sources, and temporarily unavailable tracking without corrupting the simulation. Step 10 maps XR controller/hand poses into the authoritative Player input boundary and maps thumbstick input to normalized thrust without directly changing authoritative position.

Input should be frame-rate independent wherever it affects gameplay.

## Step 8 simulation boundary
The input layer supplies normalized thrust, head orientation, both hand states, and whether the player is looking toward the left hand through the authoritative Player input boundary. The simulation owns movement, velocity, and menu state. WebXR session/pose acquisition and final hand-pose mapping remain renderer/input-layer work for Step 10.

## Step 9 update
The existing authoritative left/right hand position state is also the input boundary for trap interaction. While captured, an active hand near a crack point drags that point toward the authoritative trap center. WebXR pose acquisition remains outside the simulation.


## Coordinate consistency
Controller grip/target poses are queried relative to the same XR reference space used for the viewer. Their physical positions are converted into the authoritative Player coordinate system using the same X/Y/Z mapping as world rendering. Visual controller markers remain in XR reference-space coordinates so they stay physically attached to the user's hands while virtual Player locomotion moves the game world around them.

XR input failures are retained with structured diagnostic codes and do not stop the XR presentation loop or redefine authoritative Player state.


## Start gate input
The immersive scene begins with a selectable central start button. A controller or other XR input source must generate a primary select action whose target ray intersects the button. The event handler obtains the target-ray pose from the event's XRFrame, which is the WebXR-supported method for hit testing at the input event's time. citeturn999353search0turn999353search3

Input diagnostics now expose both input-source count and successfully tracked-pose count, along with select/squeeze event counts. This makes missing controllers, temporarily unavailable poses, and a functioning input source with no current gameplay effect distinguishable.
