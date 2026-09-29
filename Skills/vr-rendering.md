# VR Rendering

The VR version uses WebXR for immersive VR when supported. Step 10 has a dedicated `vr/renderer.js` WebGL/WebXR renderer, while `vr/index.html` always provides an independent Canvas 2D desktop preview. WebXR availability must not prevent the desktop preview from initializing.

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

The current `vr/index.html` page is still a 2D simulation preview, not a completed immersive WebXR scene. Its animation loop separates simulation updates from drawing. If WebGL context creation fails, it attempts to use a Canvas 2D fallback; if the shader program is unavailable, it draws the fallback on the existing overlay canvas. This is intended to prevent a blank preview, including on mobile browsers, but still requires testing on the actual device.

## Minimal preview
The current VR page intentionally uses Canvas 2D instead of WebGL/WebXR. It renders a square field with three circular hitboxes: yellow Metaball, red Spike, and cyan/blue Glitch. Their positions are read from the authoritative simulation. The preview measures the stage element for its logical world size and tolerates an initially zero-sized mobile layout before creating the entities. This is a temporary visualization foundation before detailed VR rendering is rebuilt.
The minimal 2D preview renders every entity in each authoritative Metaball, Spike, and Glitch collection. Glitches use the exact prototype RGBA color `#00FFC8FF`. The preview normalizes configured 8-digit RGBA hex colors to `rgba(...)` strings at Canvas draw time so the exact configured colors remain reliable on browsers with incomplete 8-digit-hex Canvas support. The page does not create, move, reset, or otherwise own gameplay entities.
## Immersive coordinate and environment rules

The authoritative simulation remains a flat X/Y gameplay plane, but immersive VR maps that plane onto horizontal X/Z space. The authoritative Z coordinate is vertical in VR. Controller/headset Y is mapped to Player Z, while controller/headset Z is mapped to the simulation's Y axis.

The immersive scene has a light-gray-to-dark-gray sky gradient, a dark floor beneath the player, and a player-centered dotted grid. The grid is rendered as a single point mesh rather than one WebGL draw call per dot. XR views always use the projection and view matrices supplied by WebXR and render into each XR viewport.
