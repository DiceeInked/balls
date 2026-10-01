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

When the Player is captured, the scene background becomes black, normal environment geometry is hidden, and the authoritative trap is rendered as a red three-dimensional reality crack. Each branch is an irregular 3D fissure with a tiny red endpoint orb and a visible center target. Sealed branches disappear into the center. After the final repair, the renderer performs a short inward reconstruction/healing animation before removing the visual. Trap state remains entirely owned by the simulation.

## Color and visibility

The authoritative prototype colors remain:
- Metaballs: yellow
- Spikes: red
- Glitches: cyan #00FFC8FF
- Player: blue
- XP pickup: black
- Trap cracks: red `#FF1744`, with a brighter red core and a softer red glow

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


## Deferred visual redesign

Do not implement this section until the user explicitly asks to resume the visual redesign. This is a visual target only. The current working renderer must remain untouched while this is a design note, and the implementation technique is left to the renderer.

### Floor and background
- The gameplay floor must be completely invisible. It may exist internally for technical XR purposes, but it must not appear as a solid surface.
- The visible floor reference is a conceptual dotted grid: imagine evenly spaced grid lines, but show only a dot at every line intersection. The grid lines themselves are invisible.
- This dotted reference is visual only. It must not affect collisions, coordinates, movement, bounds, or simulation.
- The background fades from white-gray overhead, through dark gray around the horizon, to darker gray below. Looking straight down, the center of the view fades to pitch black. Because the floor is invisible, that black region remains visible.
- Choose any rendering method that produces this appearance. Do not treat this description as a shader or skybox requirement.

### Metaballs
- From outside, Metaballs are completely opaque. The player cannot see through their outer surface.
- From inside one, it should feel like being inside a giant bubble, with the interior visible.
- The black center dot is visible when it exists. If no black dot has been generated, show the glowy white center effect instead.
- Keep Metaballs approximately their current size. Do not enlarge them.
- Do not change their authoritative collision radius just to achieve the visual effect.

### Spikes
- Spikes must look like substantial 3D polygonal figures with visible depth and volume.
- They must not read as thin flat plates sliding over the ground.
- Preserve the visual connection between their polygon detail and authoritative XP. The exact 3D rendering technique is implementation-defined.

### Glitches
- Keep the authoritative Glitch hitbox as the current circular shape. Do not render that circle.
- Instead, show rapidly changing red and blue rectangular/box-like fragments around the real hitbox.
- Fragments are randomly sized, rapidly repositioned, and approximately 50% transparent.
- The fragments are billboard-like 2D visual elements that continually face the viewer. Another technique is fine if it produces the same always-facing result.
- These visual fragments never replace or modify the circular hitbox.

### Player
- Make the Player's visible 3D body substantially smaller because the current body reads as oversized.
- This is visual only. Do not change the authoritative Player collision radius, movement, capture, or other simulation mechanics.

### Placeholder textures
- Existing textures/assets are placeholders. Do not spend time redesigning or replacing them as part of this pass.
- The target is the final visible behavior and composition; texture work can happen later.
