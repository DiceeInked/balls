# VR Rendering

The VR version uses WebXR for immersive VR when supported.

The VR entry flow should:
- Detect whether immersive VR is supported.
- Request an immersive VR session.
- Use the headset's view and input poses.
- Track the player's hands/controllers.
- Render the world stereoscopically through the XR rendering loop.

Rendering colors:
- Metaballs: yellow
- Spikes: red
- Glitches: blue
- Player: blue
- XP pickup orb: black
- Metaball glow: bright white
- Player trap cracks: glowing

The renderer must not own authoritative gameplay state.

WebGL code should avoid fragile assumptions about device uniform limits, shader capacity, or GPU features. Quest-class hardware is a target, so rendering should favor predictable GPU usage.

WebXR and WebGL failures should surface useful diagnostics instead of silently destroying or resetting simulation state.

## Current 2D preview behavior

The current `vr/index.html` page is still a 2D simulation preview, not a completed immersive WebXR scene. Its animation loop now separates simulation updates from drawing. If WebGL context creation fails, it attempts to use a Canvas 2D fallback; if the shader program is unavailable, it draws the fallback on the existing overlay canvas. This is intended to prevent a blank preview, including on mobile browsers, but still requires testing on the actual device.


## Minimal preview
The current VR page intentionally uses Canvas 2D instead of WebGL/WebXR. It renders a square field with three circular hitboxes: yellow Metaball, red Spike, and cyan/blue Glitch. Their positions are read from the authoritative simulation. This is a temporary visualization foundation before detailed VR rendering is rebuilt.
