import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js";

/*
 * Balls VR renderer
 *
 * Rendering architecture:
 * - Three.js WebGLRenderer owns WebXR presentation, stereo cameras, view
 *   transforms, and the XR render loop.
 * - VRWorld remains authoritative. This module only turns simulation state
 *   into 3D scene objects and sends headset/controller input back through
 *   VRWorld.setPlayerInput().
 * - The simulation plane is displayed as a genuine 3D world: X -> world X,
 *   simulation Z -> world Y, simulation Y -> world -Z.
 */

const WORLD_SCALE = 0.01;
const FLOOR_SIZE = 32;
const GRID_SIZE = 32;
const GRID_DIVISIONS = 32;

const COLORS = {
  metaball: 0xffed00,
  spike: 0xff0055,
  glitch: 0x00ffc8,
  player: 0x3b82f6,
  white: 0xffffff,
  black: 0x050505,
  floor: 0x101217,
  grid: 0x30353d,
  gridCenter: 0x48515c,
  start: 0x00ffc8,
  startAccent: 0xffed00
};

function finiteOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function disposeObject(object) {
  if (!object) return;
  object.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (material.map) material.map.dispose();
        material.dispose();
      }
    }
  });
}

class VRRenderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.world = world;

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.worldRoot = null;
    this.floor = null;
    this.grid = null;
    this.startGate = null;
    this.startButton = null;
    this.startLabel = null;
    this.trapGroup = null;
    this.playerGroup = null;

    this.entityObjects = new Map();
    this.entityGeometryCache = new Map();
    this.entityMaterialCache = new Map();

    this.controllers = [];
    this.controllerGrips = [];
    this.hands = [];
    this.controllerRays = [];
    this.inputMeshes = [];

    this.raycaster = new THREE.Raycaster();
    this.tempVec3 = new THREE.Vector3();
    this.tempVec3b = new THREE.Vector3();
    this.tempQuat = new THREE.Quaternion();
    this.tempEuler = new THREE.Euler(0, 0, 0, "YXZ");
    this.lastViewerPosition = new THREE.Vector3();
    this.lastViewerQuaternion = new THREE.Quaternion();
    this.viewerPositionInitialized = false;
    this.viewerQuaternionInitialized = false;

    this.running = false;
    this.startGateActive = false;
    this.onStartRequested = null;

    this.diagnostics = {
      lastError: null,
      errorCount: 0,
      errors: [],
      lastStage: "idle",
      inputSourceCount: 0,
      trackedInputCount: 0,
      viewCount: 0,
      referenceSpace: "local-floor",
      framebufferWidth: 0,
      framebufferHeight: 0,
      poseMotion: 0,
      poseRotation: 0,
      posePosition: null,
      poseOrientation: null,
      selectCount: 0,
      squeezeCount: 0,
      inputSourceEvents: 0,
      renderedObjects: 0
    };

    this.contextEventsAttached = false;
    this._boundSetSize = () => this.resize();
  }

  get isActive() {
    return this.running && !!this.renderer && this.renderer.xr.isPresenting;
  }

  get isSupported() {
    return typeof navigator !== "undefined" &&
      !!navigator.xr &&
      typeof navigator.xr.isSessionSupported === "function";
  }

  setStartGateActive(active) {
    this.startGateActive = active === true;
    if (this.startGate) this.startGate.visible = this.startGateActive;
  }

  recordError(code, message, stage) {
    const entry = {
      code: String(code || "XR-UNKNOWN-001"),
      message: String(message || "Unknown renderer error."),
      stage: String(stage || "unknown"),
      frame: this.renderer ? this.renderer.info.render.calls : 0,
      time: performance.now()
    };

    this.diagnostics.lastError = entry;
    this.diagnostics.errorCount += 1;
    this.diagnostics.lastStage = entry.stage;
    this.diagnostics.errors.unshift(entry);
    if (this.diagnostics.errors.length > 12) {
      this.diagnostics.errors.length = 12;
    }
  }

  getDiagnostics() {
    return {
      active: this.isActive,
      supported: this.isSupported,
      frameCount: this.diagnostics.frameCount || 0,
      lastPoseTime: this.diagnostics.lastPoseTime || 0,
      inputSourceCount: this.diagnostics.inputSourceCount,
      trackedInputCount: this.diagnostics.trackedInputCount,
      viewCount: this.diagnostics.viewCount,
      lastStage: this.diagnostics.lastStage,
      referenceSpace: this.diagnostics.referenceSpace,
      framebufferWidth: this.diagnostics.framebufferWidth,
      framebufferHeight: this.diagnostics.framebufferHeight,
      poseMotion: this.diagnostics.poseMotion,
      poseRotation: this.diagnostics.poseRotation,
      posePosition: this.diagnostics.posePosition,
      poseOrientation: this.diagnostics.poseOrientation,
      selectCount: this.diagnostics.selectCount,
      squeezeCount: this.diagnostics.squeezeCount,
      inputSourceEvents: this.diagnostics.inputSourceEvents,
      renderedObjects: this.diagnostics.renderedObjects,
      errorCount: this.diagnostics.errorCount,
      lastError: this.diagnostics.lastError,
      errors: this.diagnostics.errors.slice(0, 8)
    };
  }

  ensureRenderer() {
    if (this.renderer) return;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        depth: true,
        stencil: false,
        powerPreference: "high-performance"
      });

      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);
      this.renderer.setClearColor(0x08090d, 1);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.xr.enabled = true;
      this.renderer.xr.setReferenceSpaceType("local-floor");
      this.renderer.debug.checkShaderErrors = true;

      this.renderer.xr.addEventListener("sessionstart", () => {
        this.running = true;
        this.setStartGateActive(true);
        this.diagnostics.lastStage = "session-active";
        this.viewerPositionInitialized = false;
        this.viewerQuaternionInitialized = false;
      });

      this.renderer.xr.addEventListener("sessionend", () => {
        this.running = false;
        this.setStartGateActive(false);
        this.diagnostics.lastStage = "session-ended";
      });

      if (!this.contextEventsAttached) {
        this.contextEventsAttached = true;

        this.canvas.addEventListener("webglcontextlost", event => {
          event.preventDefault();
          this.recordError(
            "GL-CONTEXT-001",
            "Three.js WebGL context was lost.",
            "webgl-context"
          );
        });

        this.canvas.addEventListener("webglcontextrestored", () => {
          this.recordError(
            "GL-CONTEXT-002",
            "Three.js WebGL context was restored.",
            "webgl-context"
          );
        });
      }

      this.buildScene();
      this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
      window.addEventListener("resize", this._boundSetSize);
    } catch (error) {
      const message = String(error && error.message || error);
      this.recordError("GL-INIT-001", message, "webgl-init");
      throw error;
    }
  }

  buildScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0d12);
    this.scene.fog = new THREE.Fog(0x0c0d12, 5, 24);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / Math.max(1, window.innerHeight), 0.01, 100);
    this.camera.position.set(0, 1.6, 0);

    this.worldRoot = new THREE.Group();
    this.scene.add(this.worldRoot);

    const ambient = new THREE.HemisphereLight(0xd9dde7, 0x161922, 1.75);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 7, 2);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x9bb6ff, 1.2);
    rim.position.set(-4, 3, -5);
    this.scene.add(rim);

    this.buildEnvironment();
    this.buildPlayerVisual();
    this.buildControllers();
    this.buildStartGate();
    this.buildTrap();

    this.diagnostics.lastStage = "scene-built";
  }

  buildEnvironment() {
    const floorGeometry = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.floor,
      roughness: 0.94,
      metalness: 0.02
    });

    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = 0;
    this.floor.receiveShadow = false;
    this.scene.add(this.floor);

    this.grid = new THREE.GridHelper(
      GRID_SIZE,
      GRID_DIVISIONS,
      COLORS.gridCenter,
      COLORS.grid
    );
    this.grid.position.y = 0.012;
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.36;
    this.scene.add(this.grid);

    const horizonRing = new THREE.Mesh(
      new THREE.TorusGeometry(9.5, 0.018, 6, 96),
      new THREE.MeshBasicMaterial({
        color: 0x252b34,
        transparent: true,
        opacity: 0.6
      })
    );
    horizonRing.rotation.x = Math.PI / 2;
    horizonRing.position.y = 0.025;
    this.scene.add(horizonRing);
  }

  makeEmissiveMaterial(color, intensity, roughness = 0.45) {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.04,
      emissive: color,
      emissiveIntensity: intensity
    });
    return material;
  }

  makeGlowMaterial(color, opacity) {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  buildPlayerVisual() {
    this.playerGroup = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      this.makeEmissiveMaterial(COLORS.player, 1.8, 0.28)
    );
    body.scale.set(1, 1.1, 1);
    body.position.set(0, 1.48, 0);
    this.playerGroup.add(body);

    const left = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      this.makeEmissiveMaterial(COLORS.glitch, 1.7, 0.26)
    );
    left.position.set(-0.4, 1.18, -0.18);

    const right = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      this.makeEmissiveMaterial(COLORS.player, 1.7, 0.26)
    );
    right.position.set(0.4, 1.18, -0.18);

    this.playerGroup.add(left, right);

    const xpPlate = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.105, 20),
      new THREE.MeshBasicMaterial({
        color: COLORS.white,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      })
    );
    xpPlate.rotation.x = -Math.PI / 2;
    xpPlate.position.set(-0.4, 1.12, -0.18);
    this.playerGroup.add(xpPlate);

    this.scene.add(this.playerGroup);
  }

  buildControllers() {
    for (let i = 0; i < 2; i += 1) {
      const controller = this.renderer.xr.getController(i);
      controller.userData.controllerIndex = i;

      const rayGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1.2)
      ]);
      const rayMaterial = new THREE.LineBasicMaterial({
        color: i === 0 ? COLORS.glitch : COLORS.player,
        transparent: true,
        opacity: 0.55
      });
      const ray = new THREE.Line(rayGeometry, rayMaterial);
      ray.visible = false;
      controller.add(ray);

      controller.addEventListener("connected", event => {
        controller.userData.inputSource = event.data;
        ray.visible = true;
      });
      controller.addEventListener("disconnected", () => {
        controller.userData.inputSource = null;
        ray.visible = false;
      });
      controller.addEventListener("selectstart", () => {
        this.diagnostics.selectCount += 1;
        this.handleXRAction(controller);
      });
      controller.addEventListener("squeezestart", () => {
        this.diagnostics.squeezeCount += 1;
        this.handleXRAction(controller);
      });

      this.scene.add(controller);
      this.controllers.push(controller);
      this.controllerRays.push(ray);

      const grip = this.renderer.xr.getControllerGrip(i);
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.075, 0),
        this.makeEmissiveMaterial(i === 0 ? COLORS.glitch : COLORS.player, 1.6, 0.3)
      );
      grip.add(marker);
      this.scene.add(grip);
      this.controllerGrips.push(grip);

      const hand = this.renderer.xr.getHand(i);
      const handMarker = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.055, 0),
        this.makeEmissiveMaterial(i === 0 ? COLORS.glitch : COLORS.player, 1.5, 0.35)
      );
      hand.add(handMarker);
      handMarker.visible = false;
      hand.addEventListener("connected", () => {
        handMarker.visible = true;
      });
      hand.addEventListener("disconnected", () => {
        handMarker.visible = false;
      });
      this.scene.add(hand);
      this.hands.push(hand);
    }
  }

  makeLabelTexture(text, foreground, background) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 192;
    const context = canvas.getContext("2d");
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = foreground;
    context.lineWidth = 8;
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    context.fillStyle = foreground;
    context.font = "900 72px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 3);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  buildStartGate() {
    this.startGate = new THREE.Group();

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.28, 0.58),
      this.makeEmissiveMaterial(COLORS.start, 2.2, 0.22)
    );
    plate.position.set(0, 1.35, -2.4);
    plate.userData.startButton = true;
    this.startButton = plate;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.035, 8, 64),
      new THREE.MeshBasicMaterial({
        color: COLORS.startAccent,
        transparent: true,
        opacity: 0.9
      })
    );
    ring.position.set(0, 1.35, -2.4);

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.36),
      new THREE.MeshBasicMaterial({
        map: this.makeLabelTexture("START", "#02130e", "#00ffc8"),
        transparent: false
      })
    );
    label.position.set(0, 1.355, -2.7);
    label.rotation.x = 0;
    this.startLabel = label;

    const probe = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.15, 1),
      this.makeEmissiveMaterial(COLORS.startAccent, 2.1, 0.22)
    );
    probe.position.set(0, 2.65, -2.4);

    const guide = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.018, 6, 48),
      new THREE.MeshBasicMaterial({
        color: COLORS.start,
        transparent: true,
        opacity: 0.78
      })
    );
    guide.position.set(0, 2.65, -2.4);

    this.startGate.add(plate, ring, label, probe, guide);
    this.scene.add(this.startGate);
    this.startGate.visible = false;
  }

  buildTrap() {
    this.trapGroup = new THREE.Group();
    this.trapGroup.visible = false;
    this.scene.add(this.trapGroup);
  }

  handleXRAction(controller) {
    if (!this.startGateActive || !this.startButton) return;

    this.raycaster.setFromXRController(controller);
    const hits = this.raycaster.intersectObject(this.startButton, false);
    if (hits.length > 0 && typeof this.onStartRequested === "function") {
      this.onStartRequested();
    }
  }

  rebuildSpikeGeometry(pointCount) {
    const count = clamp(Math.floor(pointCount), 3, 32);
    const cacheKey = String(count);
    if (this.entityGeometryCache.has(cacheKey)) {
      return this.entityGeometryCache.get(cacheKey);
    }

    const shape = new THREE.Shape();
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + Math.PI * 2 * i / count;
      const radius = i % 2 === 0 ? 1 : 0.56;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.025,
      bevelThickness: 0.018,
      steps: 1
    });
    geometry.computeVertexNormals();
    geometry.rotateX(-Math.PI / 2);

    this.entityGeometryCache.set(cacheKey, geometry);
    return geometry;
  }

  createEntityObject(entity) {
    if (entity.type === "metaball") {
      const group = new THREE.Group();

      const outer = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 14),
        this.makeEmissiveMaterial(COLORS.metaball, 1.9, 0.23)
      );

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(1.12, 16, 12),
        this.makeGlowMaterial(COLORS.white, 0.18)
      );

      const pickup = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 14, 10),
        new THREE.MeshStandardMaterial({
          color: COLORS.black,
          roughness: 0.2,
          metalness: 0.05,
          emissive: 0x000000,
          emissiveIntensity: 0
        })
      );
      pickup.visible = false;

      group.add(outer, glow, pickup);
      group.userData.kind = "metaball";
      group.userData.outer = outer;
      group.userData.glow = glow;
      group.userData.pickup = pickup;
      this.worldRoot.add(group);
      return group;
    }

    if (entity.type === "spike") {
      const count = this.world.spikePointCount(entity);
      const mesh = new THREE.Mesh(
        this.rebuildSpikeGeometry(count),
        this.makeEmissiveMaterial(COLORS.spike, 1.8, 0.3)
      );
      mesh.userData.kind = "spike";
      mesh.userData.pointCount = count;
      this.worldRoot.add(mesh);
      return mesh;
    }

    if (entity.type === "glitch") {
      const group = new THREE.Group();

      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 1),
        this.makeEmissiveMaterial(COLORS.glitch, 2.0, 0.22)
      );
      core.scale.set(1, 0.82, 1.12);

      const shell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.16, 1),
        this.makeGlowMaterial(COLORS.glitch, 0.12)
      );

      group.add(core, shell);
      group.userData.kind = "glitch";
      group.userData.core = core;
      group.userData.shell = shell;
      this.worldRoot.add(group);
      return group;
    }

    return null;
  }

  updateEntityObject(entity, object) {
    const player = this.world.player;
    const scaleX = (finiteOr(entity.x) - finiteOr(player.x)) * WORLD_SCALE;
    const scaleY = (finiteOr(entity.z) - finiteOr(player.z)) * WORLD_SCALE;
    const scaleZ = -(finiteOr(entity.y) - finiteOr(player.y)) * WORLD_SCALE;

    const radius = Math.max(0.02, finiteOr(entity.radius) * WORLD_SCALE);
    object.position.set(scaleX, scaleY + radius, scaleZ);

    if (entity.type === "metaball") {
      const radiusScale = radius / 0.35;
      object.userData.outer.scale.setScalar(radiusScale);
      object.userData.glow.scale.setScalar(radiusScale);

      const stored = entity.pickup && finiteOr(entity.pickup.storedXp) > 0;
      object.userData.pickup.visible = stored;
      object.userData.pickup.scale.setScalar(Math.max(0.18, radiusScale * 0.34));
    } else if (entity.type === "spike") {
      const pointCount = this.world.spikePointCount(entity);
      if (object.userData.pointCount !== pointCount) {
        const oldGeometry = object.geometry;
        object.geometry = this.rebuildSpikeGeometry(pointCount);
        object.userData.pointCount = pointCount;
        if (!this.entityGeometryCacheHasGeometry(oldGeometry)) oldGeometry.dispose();
      }

      object.scale.setScalar(radius);
      const direction = finiteOr(entity.direction);
      object.rotation.set(0, direction, 0);
    } else if (entity.type === "glitch") {
      const coreScale = radius / 0.35;
      object.userData.core.scale.set(coreScale, coreScale * 0.82, coreScale * 1.12);
      object.userData.shell.scale.setScalar(coreScale * 1.05);
      object.rotation.y += 0.01;
      object.rotation.x += 0.006;
    }
  }

  entityGeometryCacheHasGeometry(geometry) {
    for (const cached of this.entityGeometryCache.values()) {
      if (cached === geometry) return true;
    }
    return false;
  }

  syncEntities() {
    const liveIds = new Set();

    const all = [
      ...this.world.metaballs,
      ...this.world.spikes,
      ...this.world.glitches
    ];

    for (const entity of all) {
      if (!entity || entity.remove || !Number.isFinite(entity.id)) continue;
      liveIds.add(entity.id);

      let object = this.entityObjects.get(entity.id);
      if (!object) {
        object = this.createEntityObject(entity);
        if (!object) continue;
        this.entityObjects.set(entity.id, object);
      }

      this.updateEntityObject(entity, object);
    }

    for (const [id, object] of this.entityObjects) {
      if (liveIds.has(id)) continue;
      this.worldRoot.remove(object);
      disposeObject(object);
      this.entityObjects.delete(id);
    }
  }

  updatePlayerVisual() {
    const player = this.world.player;
    if (!playerGroupSafe(this.playerGroup)) return;

    this.playerGroup.visible = !player.captured;
    const leftHandVisible = player.leftHand && player.leftHand.active;
    const rightHandVisible = player.rightHand && player.rightHand.active;

    this.playerGroup.children[1].visible = !leftHandVisible;
    this.playerGroup.children[2].visible = !rightHandVisible;
    this.playerGroup.children[3].visible = !leftHandVisible && player.xp > 0;
  }

  updateTrapVisual() {
    const player = this.world.player;
    if (!player.captured || !player.trap) {
      this.trapGroup.visible = false;
      return;
    }

    this.trapGroup.visible = true;
    this.trapGroup.clear();

    const center = this.simToView(player.trap.center);
    const centerMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 8),
      this.makeEmissiveMaterial(COLORS.white, 3.2, 0.2)
    );
    centerMarker.position.copy(center);
    this.trapGroup.add(centerMarker);

    const crackMaterial = new THREE.LineBasicMaterial({
      color: COLORS.white,
      transparent: true,
      opacity: 0.95
    });

    for (const point of player.trap.points) {
      const viewPoint = this.simToView(point);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        center,
        viewPoint
      ]);
      this.trapGroup.add(new THREE.Line(geometry, crackMaterial));

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(point.sealed ? 0.055 : 0.04, 10, 8),
        this.makeEmissiveMaterial(COLORS.white, point.sealed ? 2.8 : 1.7, 0.25)
      );
      dot.position.copy(viewPoint);
      this.trapGroup.add(dot);
    }
  }

  simToView(point) {
    const player = this.world.player;
    return new THREE.Vector3(
      (finiteOr(point.x) - finiteOr(player.x)) * WORLD_SCALE,
      (finiteOr(point.z) - finiteOr(player.z)) * WORLD_SCALE + 1.35,
      -(finiteOr(point.y) - finiteOr(player.y)) * WORLD_SCALE - 0.8
    );
  }

  updateWorldRoot() {
    const player = this.world.player;
    this.worldRoot.position.set(
      -finiteOr(player.x) * WORLD_SCALE,
      -finiteOr(player.z) * WORLD_SCALE,
      finiteOr(player.y) * WORLD_SCALE
    );
  }

  updateInput(frame) {
    if (!this.renderer || !this.renderer.xr.isPresenting) return;

    const session = this.renderer.xr.getSession();
    const referenceSpace = this.renderer.xr.getReferenceSpace();
    if (!session || !referenceSpace) return;

    const player = this.world.player;
    let thrustX = 0;
    let thrustY = 0;
    let thrustZ = 0;
    let leftHand = null;
    let rightHand = null;

    this.diagnostics.inputSourceCount = session.inputSources.length;
    this.diagnostics.trackedInputCount = 0;

    for (const source of session.inputSources) {
      const inputSpace = source.gripSpace || source.targetRaySpace;
      if (!inputSpace) continue;

      const pose = frame && frame.getPose
        ? frame.getPose(inputSpace, referenceSpace)
        : null;

      if (!pose) continue;
      this.diagnostics.trackedInputCount += 1;

      const p = pose.transform.position;
      const hand = {
        x: player.x + p.x / WORLD_SCALE,
        y: player.y - p.z / WORLD_SCALE,
        z: player.z + p.y / WORLD_SCALE,
        active: true
      };

      if (source.handedness === "left") leftHand = hand;
      if (source.handedness === "right") rightHand = hand;

      const axes = source.gamepad && source.gamepad.axes ? source.gamepad.axes : [];
      const axisX = finiteOr(axes[0]);
      const axisY = finiteOr(axes[1]);

      if (source.handedness === "left") {
        thrustX += axisX;
        thrustY -= axisY;
      } else if (source.handedness === "right") {
        thrustZ += axisX;
        thrustY -= axisY;
      }
    }

    const magnitude = Math.hypot(thrustX, thrustY, thrustZ);
    if (magnitude > 1) {
      thrustX /= magnitude;
      thrustY /= magnitude;
      thrustZ /= magnitude;
    }

    const xrCamera = this.renderer.xr.getCamera();
    const firstCamera = xrCamera && xrCamera.cameras && xrCamera.cameras[0]
      ? xrCamera.cameras[0]
      : xrCamera;

    let pitch = 0;
    let yaw = 0;
    let roll = 0;

    if (firstCamera) {
      this.tempEuler.setFromQuaternion(firstCamera.quaternion, "YXZ");
      pitch = this.tempEuler.x;
      yaw = this.tempEuler.y;
      roll = this.tempEuler.z;
    }

    let gazeAtLeftHand = false;
    if (leftHand && firstCamera) {
      const handWorld = new THREE.Vector3(
        (leftHand.x - player.x) * WORLD_SCALE,
        (leftHand.z - player.z) * WORLD_SCALE,
        -(leftHand.y - player.y) * WORLD_SCALE
      );

      const cameraPosition = new THREE.Vector3();
      const cameraDirection = new THREE.Vector3();
      firstCamera.getWorldPosition(cameraPosition);
      firstCamera.getWorldDirection(cameraDirection);

      const distance = handWorld.length();
      if (distance > 0.0001) {
        const handDirection = handWorld.normalize();
        gazeAtLeftHand = cameraDirection.dot(handDirection) > 0.82;
      }
    }

    this.world.setPlayerInput({
      thrust: {
        x: thrustX,
        y: thrustY,
        z: thrustZ
      },
      head: {
        pitch,
        yaw,
        roll
      },
      leftHand: leftHand || {
        x: player.x,
        y: player.y,
        z: player.z,
        active: false
      },
      rightHand: rightHand || {
        x: player.x,
        y: player.y,
        z: player.z,
        active: false
      },
      gazeAtLeftHand
    });

    this.diagnostics.lastStage = "input";
  }

  updatePoseDiagnostics() {
    if (!this.renderer || !this.renderer.xr.isPresenting) return;

    const xrCamera = this.renderer.xr.getCamera();
    if (!xrCamera) return;

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    xrCamera.getWorldPosition(position);
    xrCamera.getWorldQuaternion(quaternion);

    if (this.viewerPositionInitialized) {
      this.diagnostics.poseMotion = position.distanceTo(this.lastViewerPosition);
    } else {
      this.diagnostics.poseMotion = 0;
      this.viewerPositionInitialized = true;
    }

    if (this.viewerQuaternionInitialized) {
      const dot = Math.abs(quaternion.dot(this.lastViewerQuaternion));
      this.diagnostics.poseRotation = 2 * Math.acos(clamp(dot, 0, 1));
    } else {
      this.diagnostics.poseRotation = 0;
      this.viewerQuaternionInitialized = true;
    }

    this.lastViewerPosition.copy(position);
    this.lastViewerQuaternion.copy(quaternion);

    this.diagnostics.posePosition = {
      x: position.x,
      y: position.y,
      z: position.z
    };

    this.diagnostics.poseOrientation = {
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w
    };
  }

  updateFramebufferDiagnostics() {
    if (!this.renderer) return;

    const size = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(size);
    this.diagnostics.framebufferWidth = Math.round(size.x);
    this.diagnostics.framebufferHeight = Math.round(size.y);

    const xrCamera = this.renderer.xr.getCamera();
    this.diagnostics.viewCount = xrCamera && xrCamera.cameras
      ? xrCamera.cameras.length
      : 0;
  }

  render(time, frame) {
    if (!this.renderer || !this.scene || !this.camera) return;

    try {
      this.diagnostics.lastPoseTime = finiteOr(time);
      this.diagnostics.lastStage = "frame";

      if (this.renderer.xr.isPresenting) {
        this.updateInput(frame);
        this.updatePoseDiagnostics();
        this.updateFramebufferDiagnostics();
      }

      this.updateWorldRoot();
      this.syncEntities();
      this.updatePlayerVisual();

      const captured = !!(this.world.player && this.world.player.captured);
      this.scene.background.setHex(captured ? 0x000000 : 0x0c0d12);
      if (this.grid) this.grid.visible = !captured && !this.startGateActive;
      if (this.floor) this.floor.visible = !captured && !this.startGateActive;
      if (this.playerGroup) this.playerGroup.visible = !captured && !this.startGateActive;

      if (this.startGateActive) {
        this.startGate.rotation.y = Math.sin(time * 0.001) * 0.035;
        this.startGate.position.y = Math.sin(time * 0.0014) * 0.035;
      }

      if (captured) {
        this.updateTrapVisual();
      } else {
        this.trapGroup.visible = false;
      }

      this.renderedObjectsCount();

      this.renderer.render(this.scene, this.camera);
      this.diagnostics.lastStage = "rendered";
    } catch (error) {
      const message = String(error && error.message || error);
      this.recordError("XR-RENDER-001", message, "render");
      console.error("VR render error:", error);
    }
  }

  renderedObjectsCount() {
    this.diagnostics.renderedObjects =
      this.entityObjects.size +
      (this.startGateActive ? 2 : 0) +
      (this.world.player && !this.world.player.captured ? 1 : 0);
  }

  resize() {
    if (!this.renderer) return;
    if (this.renderer.xr.isPresenting) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    if (this.camera) {
      this.camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
      this.camera.updateProjectionMatrix();
    }
  }

  async start() {
    this.ensureRenderer();

    if (!this.isSupported) {
      const message = "WebXR is not available in this browser.";
      this.recordError("XR-SUPPORT-001", message, "support-check");
      throw new Error(message);
    }

    let session = null;
    let referenceType = "local-floor";

    try {
      try {
        session = await navigator.xr.requestSession("immersive-vr", {
          requiredFeatures: ["local-floor"],
          optionalFeatures: ["hand-tracking"]
        });
      } catch (firstError) {
        referenceType = "local";
        session = await navigator.xr.requestSession("immersive-vr", {
          optionalFeatures: ["hand-tracking"]
        });
        this.renderer.xr.setReferenceSpaceType("local");
        this.diagnostics.referenceSpace = "local";
      }

      if (!session) {
        throw new Error("XR session creation returned no session.");
      }

      this.diagnostics.referenceSpace = referenceType;
      await this.renderer.xr.setSession(session);
      this.setStartGateActive(true);
      this.running = true;
      this.diagnostics.lastStage = "session-ready";
      return true;
    } catch (error) {
      const message = String(error && error.message || error);
      this.recordError("XR-START-001", message, "session-start");

      if (session) {
        try {
          await session.end();
        } catch {}
      }

      throw new Error(message);
    }
  }

  async stop() {
    if (!this.renderer) return;

    const session = this.renderer.xr.getSession();
    if (!session) {
      this.running = false;
      return;
    }

    try {
      await session.end();
    } catch (error) {
      this.recordError(
        "XR-STOP-001",
        String(error && error.message || error),
        "session-end"
      );
      this.running = false;
    }
  }
}

function playerGroupSafe(group) {
  return !!group && group.children && group.children.length >= 4;
}

window.VRRenderer = VRRenderer;
window.VRWorldThree = THREE;

export { VRRenderer };
