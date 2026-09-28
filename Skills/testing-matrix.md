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
- New Glitch random direction
- New child bounds validation
- Contact timer reset after separation

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
- Persistence rejection does not replace valid in-memory state
- Metaball pickup persistence
- WebGL context unavailable
- Shader compilation/link failure
- 2D fallback remains visible when WebGL is unavailable
- iPhone Safari portrait and landscape layout
- WebXR unavailable
- WebXR session start/end
- Quest-class performance

A mechanic is not considered verified merely because it looks correct visually. The authoritative state must also be correct. Device-specific checks should be performed on the actual target browser before claiming they pass.

## Step 6 verification

Verify:
- A Spike's point count is an integer between 3 and 32 and changes only through its authoritative XP.
- Metaball/Spike contact transfers 1 XP immediately and one more per additional full uninterrupted second.
- Ending contact resets the continuous drain.
- Wall contact splits a Spike above the minimum point count.
- Spike/Spike contact performs the defined split behavior.
- A 3-point Spike is destroyed by the next qualifying collision.
- Glitch/Spike contact does not apply a generic bounce.
- Glitch/Spike contact removes the Spike, gives half its XP to the existing Glitch, creates one new Glitch with the other half, randomizes its direction, and keeps it in bounds.
- No removed entity participates in later collision checks.
