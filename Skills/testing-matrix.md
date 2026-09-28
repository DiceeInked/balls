# Testing Matrix

Every major mechanic needs both isolated and combined tests.

Metaball tests:
- Wall bounce
- Collidable bounce
- XP gain on bounce
- Spike drain
- Glitch drain
- Reproduction above 32 XP
- Opposite-direction child
- 100-second pickup generation
- Pickup collection

Spike tests:
- XP-to-vertex behavior
- Wall split
- Spike split
- Qualifying-object split
- Low-vertex disappearance
- Metaball drain
- Glitch consumption
- Half-XP transfer
- New Glitch creation

Glitch tests:
- Steering at 16, 32, 64, and 128 XP
- Metaball drain
- Zero-XP death
- Spike consumption
- Existing/new Glitch XP split
- Random new direction
- Player drain

Player tests:
- Head and hand tracking
- Thruster/control behavior
- XP display
- Left-hand menu
- Passive 100-second drain
- Glitch drain
- Spike capture
- Crack repair and release
- XP pickup collection

System tests:
- High-speed collision tunneling
- Simultaneous contacts
- Entity destruction during collision processing
- Long-running simulation
- Hidden-tab throttling
- Persistence and resume
- WebGL context unavailable
- Shader compilation/link failure
- 2D fallback remains visible when WebGL is unavailable
- iPhone Safari portrait and landscape layout
- WebXR unavailable
- WebXR session start/end
- Quest-class performance

A mechanic is not considered verified merely because it looks correct visually. The authoritative state must also be correct. Device-specific checks should be performed on the actual target browser before claiming they pass.


## Visualization smoke test
Before detailed VR rendering is added, verify that the VR page loads on desktop and iPhone Safari and visibly shows the square field plus the three placeholder object shapes. On mobile, also verify that the stage has nonzero measured dimensions before entity initialization and that a resize/layout event does not make the entities disappear.
The visualization smoke test should verify that the authoritative Glitch collection contains the expected prototype Glitch and that it is visibly rendered in the exact configured blue/cyan color. It should also verify that the configured 8-digit RGBA color values are normalized successfully for Canvas rendering.

## Movement prototype verification
The minimal VR page should show three circular entities using authoritative positions and velocities. Each entity must move from elapsed simulation time, maintain a stable direction derived from authoritative velocity, remain inside the square after wall collisions, and separate correctly when circular hitboxes overlap. Resizing the stage must change presentation bounds without resetting the entities. Rendering must not maintain a second copy of their positions.