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
    this.sky = null;
    this.startGate = null;
    this.startButton = null;
    this.startLabel = null;
    this.trapGroup = null;
    this.reconstructGroup = null;
    this.trapMaterials = null;
    this.trapVisualSnapshot = null;
    this.lastTrapActive = false;
    this.crackReconstructStart = 0;
    this.playerGroup = null;
    this.playerBody = null;
    this.playerArmLeft = null;
    this.playerHandLeft = null;
    this.playerArmRight = null;
    this.playerHandRight = null;
    this.playerXpPlate = null;

    this.entityObjects = new Map();
    this.entityGeometryCache = new Map();
    this.entityMaterialCache = new Map();

    this.controllers = [];
    this.controllerGrips = [];
    this.hands = [];
    this.controllerRays = [];
    this.inputMeshes = [];
    this.glitchTextures = { red: null, blue: null };

    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();
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

    const ambient = new THREE.HemisphereLight(0xdfe5ef, 0x12151c, 1.95);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.5);
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
    this.scene.fog = null;

    const skyGeometry = new THREE.SphereGeometry(38, 64, 48);
    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTop: { value: new THREE.Color(0xf3f4f6) },
        uHorizon: { value: new THREE.Color(0x4a4e55) },
        uBottom: { value: new THREE.Color(0x020204) }
      },
      vertexShader: `
        varying float vSkyHeight;
        void main() {
          vSkyHeight = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        uniform vec3 uBottom;
        varying float vSkyHeight;
        void main() {
          float upper = smoothstep(0.0, 0.92, max(vSkyHeight, 0.0));
          float lower = smoothstep(0.0, 1.0, max(-vSkyHeight, 0.0));
          vec3 color = mix(uHorizon, uTop, upper * upper);
          color = mix(color, uBottom, lower * lower * lower);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.sky.renderOrder = -1000;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    const dotVertices = [];
    const spacing = 0.5;
    const half = 16;
    for (let x = -half; x <= half + 0.001; x += spacing) {
      for (let z = -half; z <= half + 0.001; z += spacing) {
        dotVertices.push(x, 0, z);
      }
    }

    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(dotVertices, 3)
    );
    const dotMaterial = new THREE.PointsMaterial({
      color: 0x52565d,
      size: 0.028,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: true
    });

    this.grid = new THREE.Points(dotGeometry, dotMaterial);
    this.grid.position.y = 0.012;
    this.scene.add(this.grid);

    const horizonRing = new THREE.Mesh(
      new THREE.TorusGeometry(9.5, 0.006, 5, 96),
      new THREE.MeshBasicMaterial({
        color: 0x343940,
        transparent: true,
        opacity: 0.24
      })
    );
    horizonRing.rotation.x = Math.PI / 2;
    horizonRing.position.y = 0.02;
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
      depthWrite: false,
      depthTest: true
    });
  }

  makeBlobGeometry() {
    const geometry = new THREE.IcosahedronGeometry(1, 4);
    const position = geometry.attributes.position;

    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);

      const length = Math.max(0.0001, Math.hypot(x, y, z));
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;

      const wave =
        1 +
        0.065 * Math.sin(nx * 5.4 + nz * 2.1) +
        0.045 * Math.sin(nz * 7.1 - nx * 1.8) +
        0.032 * Math.cos((nx + nz) * 9.0);

      const horizontal = wave * (0.98 + 0.035 * Math.sin(ny * 4.0));
      let finalY = ny * wave * 0.78;

      if (finalY < -0.38) {
        finalY = -0.59 + (finalY + 0.59) * 0.32;
      }

      position.setXYZ(
        i,
        nx * horizontal,
        finalY,
        nz * horizontal
      );
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  makeGlitchTexture(color) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, 64, 64);

    context.fillStyle = color;
    context.globalAlpha = 0.95;
    context.fillRect(7, 11, 50, 39);
    context.fillRect(18, 4, 29, 56);

    context.globalCompositeOperation = "destination-out";
    context.globalAlpha = 0.34;
    context.fillRect(10, 18, 44, 5);
    context.fillRect(23, 37, 32, 6);
    context.globalCompositeOperation = "source-over";

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  getGlitchTextures() {
    if (!this.glitchTextures.red) {
      this.glitchTextures.red = this.makeGlitchTexture("#ff0055");
      this.glitchTextures.blue = this.makeGlitchTexture("#3b82f6");
    }
    return this.glitchTextures;
  }

  buildPlayerVisual() {
    this.playerGroup = new THREE.Group();

    this.playerBody = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14, 0),
      this.makeEmissiveMaterial(COLORS.player, 2.0, 0.25)
    );
    this.playerBody.scale.set(1, 1.12, 1);
    this.playerBody.position.set(0, 1.43, 0);

    const armMaterial = this.makeEmissiveMaterial(COLORS.player, 1.65, 0.28);

    this.playerArmLeft = new THREE.Mesh(
      new THREE.OctahedronGeometry(1, 0),
      armMaterial.clone()
    );
    this.playerArmLeft.scale.set(0.045, 0.27, 0.075);
    this.playerArmLeft.position.set(-0.28, 1.25, -0.08);

    this.playerArmRight = new THREE.Mesh(
      new THREE.OctahedronGeometry(1, 0),
      armMaterial.clone()
    );
    this.playerArmRight.scale.set(0.045, 0.27, 0.075);
    this.playerArmRight.position.set(0.28, 1.25, -0.08);

    const createHandWedge = () => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.04, 0.12);
      shape.lineTo(0.045, 0.12);
      shape.lineTo(0.13, -0.17);
      shape.lineTo(0.0, -0.28);
      shape.lineTo(-0.13, -0.17);
      shape.closePath();

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.07,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.012,
        bevelThickness: 0.01,
        steps: 1
      });
      geometry.translate(0, 0, -0.035);
      geometry.rotateX(Math.PI);
      return geometry;
    };

    this.playerHandLeft = new THREE.Mesh(
      createHandWedge(),
      armMaterial.clone()
    );
    this.playerHandLeft.position.set(-0.28, 0.98, -0.22);
    this.playerHandLeft.rotation.z = -0.08;

    this.playerHandRight = new THREE.Mesh(
      createHandWedge(),
      armMaterial.clone()
    );
    this.playerHandRight.position.set(0.28, 0.98, -0.22);
    this.playerHandRight.rotation.z = 0.08;
    this.playerHandRight.scale.x = -1;

    this.playerXpPlate = new THREE.Mesh(
      new THREE.RingGeometry(0.048, 0.062, 20),
      new THREE.MeshBasicMaterial({
        color: COLORS.white,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      })
    );
    this.playerXpPlate.position.set(-0.28, 0.86, -0.28);
    this.playerXpPlate.rotation.set(Math.PI / 2, 0, 0);

    this.playerGroup.add(
      this.playerBody,
      this.playerArmLeft,
      this.playerHandLeft,
      this.playerArmRight,
      this.playerHandRight,
      this.playerXpPlate
    );
    this.scene.add(this.playerGroup);
  }

  buildPlayerVisual() {
    this.playerGroup = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14, 0),
      this.makeEmissiveMaterial(COLORS.player, 2.0, 0.25)
    );
    body.scale.set(1, 1.12, 1);
    body.position.set(0, 1.43, 0);
    this.playerGroup.add(body);

    const left = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.07, 0),
      this.makeEmissiveMaterial(COLORS.glitch, 1.9, 0.24)
    );
    left.position.set(-0.34, 1.16, -0.16);

    const right = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.07, 0),
      this.makeEmissiveMaterial(COLORS.player, 1.9, 0.24)
    );
    right.position.set(0.34, 1.16, -0.16);

    this.playerGroup.add(left, right);

    const xpPlate = new THREE.Mesh(
      new THREE.RingGeometry(0.048, 0.062, 20),
      new THREE.MeshBasicMaterial({
        color: COLORS.white,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      })
    );
    xpPlate.rotation.x = -Math.PI / 2;
    xpPlate.position.set(-0.34, 1.105, -0.16);
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
    label.position.set(0, 1.355, -2.705);
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

    this.trapMaterials = {
      core: new THREE.MeshBasicMaterial({
        color: COLORS.trap,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }),
      glow: new THREE.MeshBasicMaterial({
        color: COLORS.trap,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }),
      endpoint: this.makeEmissiveMaterial(COLORS.trap, 3.5, 0.18),
      endpointGlow: this.makeGlowMaterial(COLORS.trap, 0.28),
      center: this.makeEmissiveMaterial(COLORS.trap, 4.0, 0.16),
      centerRing: new THREE.MeshBasicMaterial({
        color: COLORS.trap,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    };
  }

  clearTrapGeometry(group) {
    if (!group) return;
    for (const child of [...group.children]) {
      child.traverse(node => {
        if (node.geometry) node.geometry.dispose();
      });
      group.remove(child);
    }
  }

  makeCrackPath(endPoint, index) {
    const points = [new THREE.Vector3(0, 0, 0)];
    const direction = endPoint.clone().normalize();
    const helper = Math.abs(direction.y) > 0.8
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0);
    const perpendicular = new THREE.Vector3().crossVectors(direction, helper).normalize();

    for (let step = 1; step <= 4; step += 1) {
      const t = step / 4;
      const point = endPoint.clone().multiplyScalar(t);
      const jitter = Math.sin(index * 2.31 + step * 1.87) * 0.065 * Math.sin(Math.PI * t);
      const depthJitter = Math.cos(index * 1.73 + step * 2.41) * 0.035 * Math.sin(Math.PI * t);
      point.addScaledVector(perpendicular, jitter);
      point.z += depthJitter;
      points.push(point);
    }

    return points;
  }

  makeLinearCurve(points) {
    const curve = new THREE.Curve();
    curve.getPoint = function(t, target = new THREE.Vector3()) {
      if (points.length < 2) return target.copy(points[0] || new THREE.Vector3());
      const scaled = clamp(t, 0, 1) * (points.length - 1);
      const index = Math.min(points.length - 2, Math.floor(scaled));
      const localT = scaled - index;
      return target.lerpVectors(points[index], points[index + 1], localT);
    };
    return curve;
  }

  addCrackBranch(group, pathPoints) {
    const curve = this.makeLinearCurve(pathPoints);
    const coreGeometry = new THREE.TubeGeometry(curve, 12, 0.012, 5, false);
    const glowGeometry = new THREE.TubeGeometry(curve, 12, 0.026, 5, false);
    group.add(
      new THREE.Mesh(glowGeometry, this.trapMaterials.glow),
      new THREE.Mesh(coreGeometry, this.trapMaterials.core)
    );
  }

  crackCenterToView() {
    return new THREE.Vector3(0, 1.52, -1.62);
  }

  trapPointToLocal(center, point) {
    return new THREE.Vector3(
      (finiteOr(point.x) - finiteOr(center.x)) * WORLD_SCALE * 0.72,
      -(finiteOr(point.y) - finiteOr(center.y)) * WORLD_SCALE * 0.72,
      (finiteOr(point.z) - finiteOr(center.z)) * WORLD_SCALE * 0.45
    );
  }

  updateTrapVisual() {
    const player = this.world.player;
    const trap = player && player.trap;
    if (!player || !player.captured || !trap || !trap.active) {
      this.trapGroup.visible = false;
      return;
    }

    this.trapGroup.visible = true;
    if (this.reconstructGroup) {
      this.scene.remove(this.reconstructGroup);
      this.clearTrapGeometry(this.reconstructGroup);
      this.reconstructGroup = null;
    }

    this.clearTrapGeometry(this.trapGroup);

    const center = this.crackCenterToView();
    this.trapGroup.position.copy(center);

    const centerMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 16, 12),
      this.trapMaterials.center
    );
    this.trapGroup.add(centerMarker);

    const centerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.009, 6, 28),
      this.trapMaterials.centerRing
    );
    this.trapGroup.add(centerRing);

    const snapshot = {
      center: center.clone(),
      branches: []
    };

    for (let i = 0; i < trap.points.length; i += 1) {
      const point = trap.points[i];
      const localEnd = this.trapPointToLocal(trap.center, point);
      snapshot.branches.push({
        endpoint: localEnd.clone(),
        sealed: !!point.sealed,
        index: i
      });

      const endpointGroup = new THREE.Group();
      endpointGroup.position.copy(point.sealed ? new THREE.Vector3(0, 0, 0) : localEnd);

      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(point.sealed ? 0.025 : 0.04, 12, 8),
        this.trapMaterials.endpoint
      );
      endpointGroup.add(ball);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(point.sealed ? 0.055 : 0.09, 10, 8),
        this.trapMaterials.endpointGlow
      );
      endpointGroup.add(glow);
      this.trapGroup.add(endpointGroup);

      if (point.sealed) continue;

      const branch = this.makeCrackPath(localEnd, i);
      this.addCrackBranch(this.trapGroup, branch);
    }

    this.trapVisualSnapshot = snapshot;
    this.lastTrapActive = true;
  }

  beginCrackReconstruction(time) {
    const snapshot = this.trapVisualSnapshot;
    if (!snapshot || !snapshot.center || !snapshot.branches || snapshot.branches.length === 0) return;

    if (this.reconstructGroup) {
      this.scene.remove(this.reconstructGroup);
      this.clearTrapGeometry(this.reconstructGroup);
    }

    const group = new THREE.Group();
    group.position.copy(snapshot.center);

    for (const branch of snapshot.branches) {
      if (branch.sealed) continue;
      this.addCrackBranch(group, this.makeCrackPath(branch.endpoint, branch.index));

      const endpoint = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 12, 8),
        this.trapMaterials.endpoint
      );
      endpoint.position.copy(branch.endpoint);
      group.add(endpoint);
    }

    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 16, 12),
      this.trapMaterials.center
    );
    group.add(center);

    this.scene.add(group);
    this.reconstructGroup = group;
    this.crackReconstructStart = time;
  }

  updateCrackReconstruction(time) {
    if (!this.reconstructGroup) return;
    const elapsed = Math.max(0, time - this.crackReconstructStart);
    const duration = 650;
    const t = clamp(elapsed / duration, 0, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const scale = 1 - ease;
    this.reconstructGroup.scale.setScalar(scale);

    if (t >= 1) {
      this.scene.remove(this.reconstructGroup);
      this.clearTrapGeometry(this.reconstructGroup);
      this.reconstructGroup = null;
    }
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

      const outerMaterial = this.makeEmissiveMaterial(
        COLORS.metaball,
        1.4,
        0.34
      );
      outerMaterial.side = THREE.DoubleSide;

      const innerMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.metaball,
        roughness: 0.62,
        metalness: 0.0,
        emissive: COLORS.metaball,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const outer = new THREE.Mesh(this.makeBlobGeometry(), outerMaterial);
      const coreGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.27, 18, 14),
        this.makeGlowMaterial(COLORS.white, 0.13)
      );
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 12),
        this.makeEmissiveMaterial(COLORS.white, 3.6, 0.12)
      );
      const pickup = new THREE.Mesh(
        new THREE.SphereGeometry(0.058, 14, 10),
        this.makeEmissiveMaterial(COLORS.black, 0.05, 0.2)
      );
      pickup.visible = false;

      group.add(outer, coreGlow, core, pickup);
      group.userData.kind = "metaball";
      group.userData.outer = outer;
      group.userData.outerMaterial = outerMaterial;
      group.userData.innerMaterial = innerMaterial;
      group.userData.coreGlow = coreGlow;
      group.userData.core = core;
      group.userData.pickup = pickup;
      group.userData.baseRadius = 2.5;
      this.worldRoot.add(group);
      return group;
    }

    if (entity.type === "spike") {
      const count = this.world.spikePointCount(entity);
      const geometry = this.createSpikePolyhedron(count);
      const mesh = new THREE.Mesh(
        geometry,
        this.makeEmissiveMaterial(COLORS.spike, 2.0, 0.26)
      );
      mesh.material.flatShading = true;

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({
          color: COLORS.spike,
          transparent: true,
          opacity: 0.86
        })
      );

      const group = new THREE.Group();
      group.add(mesh, edges);
      group.userData.kind = "spike";
      group.userData.mesh = mesh;
      group.userData.edges = edges;
      group.userData.pointCount = count;
      this.worldRoot.add(group);
      return group;
    }

    if (entity.type === "glitch") {
      const group = new THREE.Group();
      const textures = this.getGlitchTextures();
      const fragments = [];

      for (let i = 0; i < 18; i += 1) {
        const isRed = i % 2 === 0;
        const material = new THREE.SpriteMaterial({
          map: isRed ? textures.red : textures.blue,
          color: 0xffffff,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          depthTest: true,
          fog: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.userData.nextChange = 0;
        sprite.userData.phase = Math.random() * Math.PI * 2;
        sprite.userData.index = i;
        group.add(sprite);
        fragments.push(sprite);
      }

      group.userData.kind = "glitch";
      group.userData.fragments = fragments;
      group.userData.visualRadius = 0.9;
      this.worldRoot.add(group);
      return group;
    }

    return null;
  }

  createSpikePolyhedron(pointCount) {
    const count = clamp(Math.floor(pointCount), 3, 32);
    const vertices = [];
    const indices = [];
    const topIndex = 0;
    const bottomIndex = 1;
    vertices.push(0, 0.82, 0);
    vertices.push(0, -0.82, 0);

    for (let i = 0; i < count; i += 1) {
      const angle = Math.PI * 2 * i / count;
      const radial = i % 2 === 0 ? 1.0 : 0.83;
      vertices.push(
        Math.cos(angle) * radial,
        0,
        Math.sin(angle) * radial
      );
    }

    for (let i = 0; i < count; i += 1) {
      const next = (i + 1) % count;
      const a = 2 + i;
      const b = 2 + next;

      indices.push(topIndex, a, b);
      indices.push(bottomIndex, b, a);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  randomizeGlitchFragment(sprite, radius, time) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const shellRadius = radius * Math.pow(Math.random(), 0.55);

    sprite.position.set(
      Math.sin(phi) * Math.cos(theta) * shellRadius,
      Math.cos(phi) * shellRadius,
      Math.sin(phi) * Math.sin(theta) * shellRadius
    );

    const width = 0.09 + Math.random() * 0.28;
    const height = 0.045 + Math.random() * 0.17;
    sprite.scale.set(width, height, 1);
    sprite.material.opacity = 0.35 + Math.random() * 0.2;
    sprite.material.rotation = Math.random() * Math.PI;
    sprite.visible = Math.random() > 0.14;

    sprite.userData.nextChange =
      time +
      55 +
      Math.random() * 180;
  }

  updateGlitchFragments(group, radius, time) {
    const fragments = group.userData.fragments || [];
    for (const fragment of fragments) {
      if (time < fragment.userData.nextChange) continue;
      this.randomizeGlitchFragment(fragment, radius, time);
    }
  }

  updateEntityObject(entity, object) {
    const player = this.world.player;
    const worldX = finiteOr(entity.x) * WORLD_SCALE;
    const worldZ = -finiteOr(entity.y) * WORLD_SCALE;

    if (entity.type === "metaball") {
      const visualRadius = object.userData.baseRadius;
      const blobHeight = visualRadius * 0.78;
      object.position.set(worldX, finiteOr(entity.z) * WORLD_SCALE + blobHeight, worldZ);
      object.userData.outer.scale.setScalar(visualRadius);
      object.userData.coreGlow.scale.setScalar(1);
      object.userData.core.scale.setScalar(1);
      object.userData.pickup.visible = !!(entity.pickup && finiteOr(entity.pickup.storedXp) > 0);
      object.userData.pickup.scale.setScalar(0.55 + visualRadius * 0.025);

      const xrCamera = this.renderer && this.renderer.xr.isPresenting
        ? this.renderer.xr.getCamera()
        : this.camera;
      const viewCamera = xrCamera && xrCamera.cameras && xrCamera.cameras.length
        ? xrCamera.cameras[0]
        : xrCamera;

      let inside = false;
      if (viewCamera) {
        const cameraPosition = new THREE.Vector3();
        const center = new THREE.Vector3();
        viewCamera.getWorldPosition(cameraPosition);
        object.getWorldPosition(center);
        inside = cameraPosition.distanceTo(center) < visualRadius * 0.94;
      }

      object.userData.outer.material = inside
        ? object.userData.innerMaterial
        : object.userData.outerMaterial;
      object.userData.outer.material.opacity = inside ? 0.48 : 1.0;
      object.userData.outer.material.transparent = inside;
      object.userData.outer.material.depthWrite = !inside;
    } else if (entity.type === "spike") {
      const pointCount = this.world.spikePointCount(entity);
      const mesh = object.userData.mesh;
      if (object.userData.pointCount !== pointCount) {
        const oldGeometry = mesh.geometry;
        const oldEdgeGeometry = object.userData.edges.geometry;
        const geometry = this.createSpikePolyhedron(pointCount);
        mesh.geometry = geometry;
        object.userData.edges.geometry = new THREE.EdgesGeometry(geometry);
        object.userData.pointCount = pointCount;
        oldGeometry.dispose();
        oldEdgeGeometry.dispose();
      }

      mesh.scale.setScalar(0.305);
      object.userData.edges.scale.setScalar(0.305);
      object.position.set(worldX, finiteOr(entity.z) * WORLD_SCALE + 1.05, worldZ);
      object.rotation.set(0, finiteOr(entity.direction), 0);
    } else if (entity.type === "glitch") {
      const radius = object.userData.visualRadius;
      object.position.set(worldX, finiteOr(entity.z) * WORLD_SCALE + 0.95, worldZ);
      this.updateGlitchFragments(object, radius, performance.now());
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
      if (object.userData && object.userData.kind === "spike") {
        // The main Spike geometry is shared through entityGeometryCache.
        // Dispose only per-object resources here.
        if (object.userData.edge && object.userData.edge.geometry) {
          object.userData.edge.geometry.dispose();
        }
        if (object.userData.mesh && object.userData.mesh.material) {
          object.userData.mesh.material.dispose();
        }
        if (object.userData.edge && object.userData.edge.material) {
          object.userData.edge.material.dispose();
        }
      } else {
        disposeObject(object);
      }
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
      const buttons = source.gamepad && source.gamepad.buttons ? source.gamepad.buttons : [];
      const axisX = finiteOr(axes[0]);
      const axisY = finiteOr(axes[1]);
      const grab = !!(
        (buttons[0] && buttons[0].pressed) ||
        (buttons[1] && buttons[1].pressed)
      );

      hand.grab = grab;

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
        active: false,
        grab: false
      },
      rightHand: rightHand || {
        x: player.x,
        y: player.y,
        z: player.z,
        active: false,
        grab: false
      },
      gazeAtLeftHand
    });

    this.diagnostics.lastStage = "input";
  }

  updatePoseDiagnostics() {
    if (!this.renderer || !this.renderer.xr.isPresenting) return;

    const xrCamera = this.renderer.xr.getCamera();
    const viewCamera = xrCamera && xrCamera.cameras && xrCamera.cameras.length
      ? xrCamera.cameras[0]
      : xrCamera;
    if (!viewCamera) return;

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    viewCamera.getWorldPosition(position);
    viewCamera.getWorldQuaternion(quaternion);

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
      this.diagnostics.frameCount = (this.diagnostics.frameCount || 0) + 1;
      this.diagnostics.lastStage = "frame";

      if (this.renderer.xr.isPresenting) {
        try {
          this.updateInput(frame);
        } catch (error) {
          this.recordError(
            "XR-INPUT-001",
            String(error && error.message || error),
            "input"
          );
          console.error("VR XR input error:", error);
        }

        try {
          this.updatePoseDiagnostics();
          this.updateFramebufferDiagnostics();
        } catch (error) {
          this.recordError(
            "XR-DIAGNOSTIC-001",
            String(error && error.message || error),
            "diagnostics"
          );
          console.error("VR XR diagnostic error:", error);
        }
      }

      // Rendering consumes the last valid authoritative state even when
      // XR input or diagnostics fail for the current frame.
      this.updateWorldRoot();
      this.syncEntities();
      this.updatePlayerVisual();

      const captured = !!(this.world.player && this.world.player.captured);
      this.scene.background.setHex(captured ? 0x000000 : 0x0c0d12);
      if (this.sky) this.sky.visible = !captured;
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
        if (this.lastTrapActive && this.trapVisualSnapshot) {
          this.beginCrackReconstruction(time);
        }
        this.lastTrapActive = false;
      }

      this.updateCrackReconstruction(time);
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
