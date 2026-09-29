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

The immersive scene has a light-gray-to-dark-gray sky gradient, a dark floor beneath the player, and a player-centered dotted grid. The grid is rendered as a single point mesh rather than one WebGL draw call per dot. XR views always use the projection and view matrices supplied by WebXR and render into each XR viewport. The flat simulation's positive Y direction maps toward WebXR negative Z, because negative Z is forward in the XR world.

## XR environment
The immersive background uses a large world-locked sky sphere. The sphere is centered on the viewer for position-only purposes, while its translation is removed from the XR view matrix, so its light-gray-above, medium-gray-horizon, and dark-gray-below gradient stays aligned with world up instead of following the headset's screen. The XR clear color is also dark gray so a rendering failure is distinguishable from the intended environment. Controller rendering and input accept `gripSpace` with `targetRaySpace` as a fallback when a browser does not expose a grip pose.

## XR WebGL resource lifecycle
The renderer creates its WebGL shaders and buffers only after `makeXRCompatible()` resolves. That call may reconfigure the backing graphics context, so resources created before it can become invalid. Context-loss/restoration events mark the resources unavailable so they are rebuilt before rendering resumes.

## Recent XR hardening
The immersive renderer now keeps the XR WebGL canvas full-size with an explicit backing resolution instead of using a 1×1 hidden canvas. The WebGL context requests XR compatibility at creation and also calls `makeXRCompatible()`; all shaders/buffers are built after XR compatibility resolves. The XR layer uses a minimal configuration without depth or antialiasing to reduce device-specific framebuffer complexity. The XR frame loop schedules its next callback before rendering, binds the current session base layer, renders each XR view using its returned viewport, and isolates input/simulation failures from presentation.


## Recent coordinate and depth correction
The immersive renderer requests `local-floor` when available, so XR floor level is Y=0. The game floor is therefore rendered at authoritative world Z=0 relative to the Player rather than at a separate -1.55 meter offset. The visible Player body is drawn above that floor, while headset eye height remains controlled by the XR view transform.

Simulation X/Y map to XR horizontal X/-Z, and simulation Z maps to XR Y. All entity and trap positions subtract the authoritative Player position on every axis before scaling to meters. Controller and hand poses remain in the XR reference space and are used as the physical input/hand representation.

The XR layer now requests a depth buffer and the scene clears and uses depth testing after rendering the sky. This makes 3D occlusion deterministic rather than relying on draw order.

## Diagnostics
The renderer retains structured XR/WebGL error entries with codes, stage, frame count, pose timestamp, reference-space type, XR view count, input-source count, and framebuffer dimensions. Failures are recorded without silently resetting the authoritative simulation.
