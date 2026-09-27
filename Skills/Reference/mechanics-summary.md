# VR Mechanics Summary

## Core architecture

The VR version is a clean-slate simulation with one authoritative world state. Simulation is the source of truth; rendering is only a view.

The world contains Metaballs, Spikes, Glitches, the VR player, world boundaries and other collidable geometry, movement state, XP, contact timers, pickup state, capture state, and world time.

Simulation and rendering stay separate. WebGL, WebXR, tab visibility, or rendering failures must never reset the authoritative world.

World coordinates are persistent and independent of the camera or headset view. Entities have stable IDs and the state needed to simulate them.

The simulation uses elapsed world time. Continuous XP drains transfer 1 XP immediately on contact, then 1 XP after each additional full uninterrupted second. Metaball pickup generation and passive player XP loss use 100-second simulation timers. Contact timers are tracked per relevant pair.

The world should remain logically loaded when the tab is hidden or rendering is throttled. Persistent state includes world time, entities, player state, XP, positions, velocities, IDs, relevant timers, pickup state, and capture state. Resuming uses bounded simulation catch-up.

## XP

XP is always an integer. Fresh ordinary entities normally start at 16 XP unless a specific transformation rule says otherwise.

XP meanings:
- Metaball: resource, reproduction, and pickup generation.
- Spike: resource and polygon vertex count.
- Glitch: steering strength.
- Player: survival resource.

16 player XP corresponds to 1600 seconds, or 26 minutes 40 seconds, before other XP drains or losses.

XP transfers are explicit transactions. They subtract from the source and add to the destination.

## Metaballs

Metaballs are yellow and have a fixed physical size. XP does not enlarge them.

A Metaball gains XP when bouncing from a wall or qualifying collidable object. The exact XP gain per bounce is still configurable.

When a Metaball touches a Spike, the Spike drains 1 XP immediately, then 1 XP per additional full second of uninterrupted contact.

When a Metaball touches a Glitch, the Metaball drains 1 XP from the Glitch immediately, then 1 XP per additional full second. A Glitch reaching 0 XP dies.

When a Metaball has more than 32 XP, it may reproduce. The new Metaball appears at the same position with 16 XP and travels in exactly the opposite direction. The original loses 16 XP.

Every 100 seconds, a Metaball generates a physical XP pickup equal to floor(10% of its current XP), with a minimum of 1 XP.

A normal Metaball has a bright white glowing center. If it has stored pickup XP, a black orb appears in its center. The player can enter the Metaball, grab the orb, and bring it to the player's chest or head to claim all stored XP.

## Spikes

Spikes are red polygonal entities. Their rendered vertex count is derived from their XP.

Spikes gain XP by draining Metaballs. Contact transfers 1 XP immediately, then 1 XP per additional full second of continuous contact.

When a Spike hits a wall, another Spike, or another qualifying collidable object, it splits into two if it has more than 3 vertices. The children receive approximately half the parent's vertices and XP. If it has 3 or fewer vertices, the next qualifying collision makes it disappear.

When a Glitch touches a Spike, the Glitch does not bounce. The Spike disappears. The existing Glitch receives half of the Spike's XP, while the other half creates a new Glitch traveling in a random direction.

A Spike can capture the player and trigger the player-trap state.

## Glitches

Glitches are red and have a fixed physical size. XP changes their steering strength and curvature, not their size.

Reference steering behavior:
- 16 XP: essentially no useful target steering.
- 32 XP: slight curve.
- 64 XP: useful curve.
- 128 XP: extremely strong steering, approaching immediate curvature.
- 128 XP is the practical steering cap.

When a Metaball touches a Glitch, the Metaball steals 1 XP immediately, then 1 XP per additional full second of uninterrupted contact.

Glitches spread by consuming Spikes. The existing Glitch gets half the Spike XP and the other half creates a new Glitch with a random direction.

Glitches also drain player XP using the same immediate-plus-one-per-second contact rule.

Glitch visuals should look chaotic and glitch-like. The visual effect is separate from the physical hitbox.

## Player

The player is blue and represented by a 3D diamond-like head with two diamond-derived hands.

The hands act as thrusters and control surfaces. The left hand displays XP, and looking toward it opens the player menu.

The player starts at 16 XP and loses 1 XP every 100 seconds.

Glitches drain player XP immediately on contact, then once per additional full second of uninterrupted contact.

Spikes can capture the player.

The player is an authoritative VR entity. Headset orientation and hand tracking are input/presentation layers rather than replacements for the player's world position.

## Player trap

On Spike capture, the world becomes black and glowing cracks appear in front of the player.

The crack has many points and a center point. The player must find the center and drag the crack points toward it. Once the points are sufficiently sealed to the center, the crack is repaired and the player is freed.

The exact number of crack points, repair threshold, timing, and other balancing values remain configurable until explicitly decided.

## XP pickup interaction

The pickup is physically stored inside its Metaball. The black orb is the visible pickup when stored XP exists.

The player enters the Metaball, grabs the orb, and brings it to the chest or head. All stored XP is transferred to the player, and the pickup is consumed exactly once.

## Collision and lifecycle rules

Collisions are separated into physical collisions, interaction contacts, XP drains, and transformation/consumption contacts.

Fast-moving entities need swept or continuous-aware collision detection.

Physical examples include Metaball-to-wall/collidable and Spike-to-wall/Spike/collidable collisions. Interaction examples include Spike draining Metaball, Metaball draining Glitch, Glitch draining player, Glitch consuming Spike, and Spike capturing player.

Collision processing must be stable. Once an entity is transformed, destroyed, split, or consumed, later checks must not treat the old entity as active.

Entities use stable IDs and explicit lifecycle operations for spawning, updating, transforming, splitting, destroying, and collecting.

## Randomness

Randomness is used for gameplay variety, not as authoritative state.

A Glitch created by Spike consumption receives a random direction. A reproduced Metaball has the parent's position, exactly 16 XP, and exactly the opposite direction.

Random helpers should be centralized and must not create invalid or out-of-bounds entities.

## VR rendering and input

The VR version uses WebXR for immersive VR when supported.

The headset supplies view position and orientation. The hands/controllers are tracked and rendered as diamond-derived hands. The hands provide movement control through thruster/control-surface input.

The left hand provides XP display and menu interaction.

The renderer uses:
- Yellow Metaballs
- Red Spikes
- Red Glitches
- Blue player
- Black XP pickup orb
- Bright white Metaball glow
- Glowing trap cracks

Rendering must never own authoritative gameplay state. WebGL should avoid fragile assumptions about GPU limits, uniforms, shaders, or device-specific features.

Quest-class hardware is a primary target.

## Performance and debugging

Simulation and rendering should remain separate, allocations should be minimized, visual effects should be bounded, geometry/materials should be reused, collision work should use broad-phase filtering when needed, and simulation catch-up should be bounded.

The debug system should expose world time, entity IDs/types, positions, velocities, XP, Spike vertices, Glitch steering, contact timers, XP transfers, reproduction, pickups, player state, trap state, WebXR state, WebGL errors, and persistence events.

Debug output is diagnostic only and never becomes authoritative gameplay state.

## Testing

Every mechanic needs isolated and combined tests. Important cases include high-speed collision tunneling, simultaneous contacts, destruction during collision processing, long-running timers, hidden-tab behavior, persistence/resume, WebGL failure, WebXR session lifecycle, and Quest-class performance.

Visual correctness alone is not sufficient. The authoritative simulation state must also be correct.
