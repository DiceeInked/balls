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
- Glitches: red
- Player: blue
- XP pickup orb: black
- Metaball glow: bright white
- Player trap cracks: glowing

The renderer must not own authoritative gameplay state.

WebGL code should avoid fragile assumptions about device uniform limits, shader capacity, or GPU features. Quest-class hardware is a target, so rendering should favor predictable GPU usage.

WebXR and WebGL failures should surface useful diagnostics instead of silently destroying or resetting simulation state.
