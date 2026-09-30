# VR Rendering

The immersive VR version uses a real 3D scene rendered by Three.js WebGLRenderer with WebXR enabled. The current library target is Three.js r186, pinned in the module URL so a later CDN update cannot silently change the renderer.

The renderer is intentionally separated from the authoritative simulation:
- vr/simulation.js owns entities, movement, collisions, XP, timers, capture, and persistence.
- vr/renderer.js turns authoritative state into Three.js Scene, Mesh, Group, Camera, and material objects.
- WebXR presentation is delegated to Three.js WebGLRenderer.xr.
- The page's simulation loop remains independent from the renderer loop.

## Why this pipeline

The previous renderer manually drove XRWebGLLayer, raw shader programs, attribute locations, per-eye viewports, and framebuffer binding. That path produced the reported 0x501 / INVALID_VALUE failures and was difficult to make portable.

Three.js provides the standard WebXR application flow: enable renderer.xr, choose the XR reference-space type, inject the XR session with renderer.xr.setSession(), and let renderer.setAnimationLoop() drive rendering. Three.js also maintains the XR camera as an ArrayCamera with one camera per eye. This keeps projection, stereo view transforms, and XR framebuffer handling inside the rendering library.

The current code uses Three.js r186 from a pinned jsDelivr module URL. The official Three.js VR guide recommends WebGLRenderer XR enablement together with setAnimationLoop, and the current API exposes setSession, getCamera, getController, getHand, and setReferenceSpaceType.

## 3D world model

The immersive world is genuinely 3D rather than a 2D canvas projected into VR.

- Metaballs are full 3D spheres with emissive materials and a separate physical-looking pickup core.
- Spikes are extruded 3D polygonal meshes. Their polygon detail is still derived from authoritative XP, with 3 to 32 points.
- Glitches are irregular 3D icosahedron meshes with emissive cyan material and a translucent outer shell.
- The Player uses a 3D octahedron body with separate 3D hand markers.
- The floor is a real PlaneGeometry, and the reference grid is a real GridHelper.
- Lighting comes from a hemisphere light plus directional lights, so object depth and surface orientation are visible.
- Depth testing is handled by Three.js rather than direct raw WebGL calls.
- Headset and eye cameras are controlled by WebXR through Three.js.

Simulation X maps to 3D X, simulation Y maps to 3D negative Z, and simulation Z maps to 3D Y. Gameplay entities are positioned relative to the authoritative Player position so virtual locomotion moves the world around the player's physical XR space.

## WebXR session lifecycle

The VR button requests an immersive-vr session from navigator.xr using local-floor when available and falls back to local when necessary. The session is then passed to renderer.xr.setSession().

Three.js owns the actual XR presentation loop. The renderer does not manually bind an XRWebGLLayer framebuffer or manually iterate over XRView objects.

Three.js WebXRManager supplies target-ray, grip, hand, and XR-camera objects. The current renderer adds lightweight 3D markers for these spaces.

## Start gate

Immersive startup presents a selectable 3D start button before gameplay begins.

The start button is an actual BoxGeometry mesh with a glowing torus and a textured 3D label. Controller selection is tested with Three.js Raycaster.setFromXRController, so the action succeeds only when the controller target ray intersects the button.

The fixed diagnostic probe is also a real 3D mesh in the XR scene. Its purpose is to distinguish presentation problems from simulation problems, but it no longer uses a separate raw WebGL rendering path.

## Environment and trap

Normal immersive rendering uses a dark neutral 3D environment with a large floor, a player-centered reference grid, atmospheric fog, and strong but conservative lighting.

When the Player is captured, the scene background becomes black, normal environment geometry is hidden, and the authoritative crack points and center are rendered as luminous 3D lines and markers. Trap state remains entirely owned by the simulation.

## Color and visibility

The authoritative prototype colors remain:
- Metaballs: yellow
- Spikes: red
- Glitches: cyan #00FFC8FF
- Player: blue
- XP pickup: black
- Trap cracks: bright white

Materials deliberately use emissive output so gameplay objects remain clearly visible in a dark VR environment without relying on fragile per-object lights.

## Performance

Quest-class VR hardware remains the target.

The renderer reuses Three.js geometries and materials where practical. Spike geometries are cached by vertex count, and entity meshes are kept in an ID-to-object map so normal frames update transforms instead of rebuilding the scene.

No post-processing stack is currently required. The initial 3D scene favors predictable geometry, standard materials, a small light count, and bounded visual effects.

## Diagnostics

The renderer still exposes structured diagnostics for XR session state, frame count, view count, input-source count, tracked input count, reference-space type, framebuffer/drawing-buffer dimensions, viewer translation and rotation, rendered object count, selection/squeeze events, and retained WebGL context or renderer errors.

These diagnostics are for separating simulation problems from presentation problems. They do not own gameplay state.

## Current verification status

Source-level rendering architecture is implemented. Actual headset verification is still required for device-specific behavior, including browser-specific WebXR support, controller/hand tracking, visual brightness, comfort, and performance.

The desktop Canvas 2D preview remains a lightweight view of the same authoritative simulation. It is not the immersive renderer and is not used as a substitute for the 3D VR scene.
