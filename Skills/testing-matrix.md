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
- Authoritative Player starts at 16 XP
- Player position and velocity persist independently of the renderer
- Normalized thrust input produces fixed-step movement
- Movement is suspended while captured
- Head state persists and is accepted through the Player input boundary
- Both hand states persist and are accepted through the Player input boundary
- Looking-at-left-hand input opens the authoritative menu state
- XP display reads the authoritative Player XP
- Passive 100-second drain removes exactly 1 XP and clamps at zero
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

## Step 7 verification

Verify:
- Glitch physical size remains fixed as XP changes.
- Steering is effectively absent at 16 XP and progressively stronger at 32, 64, and 128 XP.
- Metaball contact transfers XP from Glitch to Metaball immediately and after each full second.
- A Glitch reaching 0 XP is removed.
- Controlled-entity contact transfers XP to the Glitch immediately and after each full second.
- Glitch/Spike consumption still gives half Spike XP to the existing Glitch and creates one new Glitch with the other half.
- New Glitch direction is randomized and remains in bounds.
- Interaction contacts reset after separation.
- Generic bounce does not override the special Glitch interactions.

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

## Reset control verification

Verify:
- R button is visible and labeled R.
- R clears the saved VR snapshot.
- R resets world time, simulation accumulator, contact timers, timer events, entity IDs, player XP, and player capture state.
- R recreates exactly the prototype Metaball, Spike, and Glitch entities.
- Refresh after pressing R resumes the newly reset world rather than the pre-reset world.

## Step 9 verification
Verify:
- Spike contact captures the Player exactly once.
- Capture clears Player movement and velocity.
- Capture creates exactly 12 crack points and one center.
- Active hand input can move a nearby point toward the center.
- A point seals at the repair threshold.
- All sealed points release the Player and clear trap state.
- Capture state and crack progress survive persistence round trips.
- Invalid or duplicate entity IDs are rejected without replacing the current world.
- A captured Player does not stop Glitch movement or steering.

## Spike split regression test
Verify wall splits create exactly two live child Spikes, both spawn inside the wall boundary, both have velocity directed away from the wall, the children do not overlap, and repeated fixed steps do not cause recursive splitting.
