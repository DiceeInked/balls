The current movement prototype uses the authoritative Metaball, Spike, and Glitch collections. The Glitch is rendered in the configured RGBA color `#00FFC8FF`.

# VR Mechanics Summary

## Core architecture

The VR version is a clean-slate simulation with one authoritative world state. Simulation is the source of truth; rendering is only a view.

The world contains Metaballs, Spikes, Glitches, the VR player, world boundaries and other collidable geometry, movement state, XP, contact timers, pickup state, capture state, and world time.

World coordinates are persistent and independent of the camera or headset view. Entities have stable IDs and the state needed to simulate them.

The page uses the authoritative `VRWorld.step()` boundary before rendering. Gameplay state lives in the simulation; the page remains a 2D preview, not a finished WebXR scene.

The simulation uses authoritative fixed-step world time. Continuous XP drains use per-pair contact timers. Metaball pickup generation and future passive player XP loss consume 100-second timer events.

Persistence remains available as a simulation mechanism, but the current VR page intentionally clears the balls-vr-world snapshot on every page load and starts from a fresh prototype. This prevents a runaway or corrupted world from surviving a refresh.

## XP

XP is always an integer. Fresh ordinary entities normally start at 16 XP unless a specific transformation rule says otherwise.

XP meanings:
- Metaball: resource, reproduction, and pickup generation.
- Spike: resource and polygon vertex count.
- Glitch: steering strength.
- Player: survival resource.

## Metaballs

Metaballs are yellow and have a fixed physical size. XP does not enlarge them.

A Metaball gains 1 XP when it bounces from a wall in the current prototype.

When a Metaball touches a Spike, the Spike drains 1 XP immediately, then 1 XP per additional full second of uninterrupted contact.

When a Metaball touches a Glitch, the Metaball drains 1 XP from the Glitch immediately, then 1 XP per additional full second. A Glitch reaching 0 XP dies.

When a Metaball has more than 32 XP, it may reproduce. The new Metaball appears at the same position with 16 XP and travels in exactly the opposite direction. The original loses 16 XP.

Every 100 seconds, a Metaball generates a physical XP pickup equal to floor(10% of its current XP), with a minimum of 1 XP.

## Spikes

Spikes are red polygonal entities with fixed physical radius. Their rendered vertex count is derived from XP:
- minimum 3 vertices
- one additional vertex per 4 XP
- maximum 32 vertices

When a Spike hits a wall, another Spike, or another qualifying collidable object, it splits into two if it has more than 3 vertices. The children receive approximately half of the parent's XP. If it has 3 vertices, the next qualifying collision destroys it.

When a Glitch touches a Spike, the Glitch does not bounce. The Spike disappears. The existing Glitch receives half of the Spike's XP, while the other half creates a new Glitch traveling in a random direction.

Player capture remains part of the later Player Trap step.

## Glitches

Glitches are cyan/blue in the current prototype and have a fixed physical size. XP changes their steering strength and curvature, not their size.

Reference steering behavior:
- 16 XP: essentially no useful target steering.
- 32 XP: slight curve.
- 64 XP: useful curve.
- 128 XP: extremely strong steering.
- 128 XP is the practical steering cap.

Glitches spread by consuming Spikes. The existing Glitch gets half the Spike XP and the other half creates a new Glitch with a random direction.

## Player

The player is blue and represented by a 3D diamond-like head with two diamond-derived hands.

The player starts at 16 XP and loses 1 XP every 100 seconds.

## Player trap

On Spike capture, the world becomes black and glowing cracks appear in front of the player. The player must drag crack points toward the center until the crack is repaired.

## Player Trap implementation
Spike contact captures the Player and creates a 12-point crack with a central target. Active hand positions drag nearby points toward the center. All points must seal before the Player is released. Capture and crack progress are persisted.

## Collision and lifecycle rules

Collisions are separated into physical collisions, interaction contacts, XP drains, and transformation/consumption contacts.

Fast-moving entities need swept or continuous-aware collision detection.

Collision processing must be stable. Once an entity is destroyed, split, or consumed, later checks must not treat the old entity as active.

## Randomness

Randomness is used for gameplay variety, not authoritative state. A Glitch created by Spike consumption receives a random direction and is clamped to valid world bounds.

## Rendering

The current preview renders yellow Metaballs, XP-linked red Spike polygons, and the configured cyan Glitches. Detailed WebXR rendering remains later.

## Testing

Visual correctness alone is not sufficient. Authoritative simulation state must also be correct.

## Spike split separation
Spike splits follow the working original prototype's child behavior: children use 55% of the parent's radius, spawn on opposite sides along the perpendicular to the parent's direction, fan their directions by ±0.24 radians, and receive an 8-frame collision cooldown. A wall bounce reflects the parent first, so both children move away from the wall.

## Recent XR hardening
Rendering architecture note: immersive XR presentation is isolated from the authoritative simulation. A failure while reading XR input or advancing the simulation is recorded as a diagnostic without suppressing the XR background/world render for that frame.
