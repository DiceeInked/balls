(() => {
  const WORLD_SCALE = 0.01;
  const GRID_SPACING = 0.5;
  const GRID_RADIUS = 10;
  const FLOOR_Y = -1.55;

  const COLORS = {
    metaball: [1, 0.929, 0, 1],
    spike: [1, 0, 0.329, 1],
    glitch: [0, 1, 0.784, 1],
    player: [0.231, 0.51, 0.965, 1],
    handLeft: [0, 1, 0.784, 1],
    handRight: [0.231, 0.51, 0.965, 1],
    white: [1, 1, 1, 1],
    black: [0, 0, 0, 1],
    floor: [0.012, 0.012, 0.015, 1]
  };

  const VERTEX_SHADER = [
    "attribute vec3 aPosition;",
    "uniform mat4 uProjection;",
    "uniform mat4 uView;",
    "uniform mat4 uModel;",
    "uniform float uPointSize;",
    "void main(){",
    "  gl_Position=uProjection*uView*uModel*vec4(aPosition,1.0);",
    "  gl_PointSize=uPointSize;",
    "}"
  ].join("");

  const FRAGMENT_SHADER = [
    "precision mediump float;",
    "uniform vec4 uColor;",
    "uniform float uGlow;",
    "void main(){",
    "  vec3 rgb=min(uColor.rgb*(1.0+uGlow),vec3(1.0));",
    "  gl_FragColor=vec4(rgb,uColor.a);",
    "}"
  ].join("");

  const SKY_VERTEX_SHADER = [
    "attribute vec2 aPosition;",
    "varying vec2 vUv;",
    "void main(){",
    "  vUv=aPosition*0.5+0.5;",
    "  gl_Position=vec4(aPosition,0.0,1.0);",
    "}"
  ].join("");

  const SKY_FRAGMENT_SHADER = [
    "precision mediump float;",
    "varying vec2 vUv;",
    "void main(){",
    "  float h=clamp(vUv.y,0.0,1.0);",
    "  vec3 below=vec3(0.035,0.035,0.04);",
    "  vec3 horizon=vec3(0.52,0.52,0.54);",
    "  vec3 above=vec3(0.72,0.72,0.74);",
    "  vec3 color;",
    "  if(h<0.5){",
    "    color=mix(below,horizon,h*2.0);",
    "  }else{",
    "    color=mix(horizon,above,(h-0.5)*2.0);",
    "  }",
    "  gl_FragColor=vec4(color,1.0);",
    "}"
  ].join("");

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Unable to create WebGL shader.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || "Unknown shader error.";
      gl.deleteShader(shader);
      throw new Error(log);
    }
    return shader;
  }

  function createProgram(gl, vertexSource, fragmentSource) {
    const program = gl.createProgram();
    if (!program) throw new Error("Unable to create WebGL program.");

    const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || "Unknown program link error.";
      gl.deleteProgram(program);
      throw new Error(log);
    }

    return program;
  }

  function createMesh(gl, vertices, mode) {
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Unable to create WebGL buffer.");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    return { buffer, count: vertices.length / 3, mode };
  }

  function createOctahedron(gl) {
    return createMesh(gl, [
       0,1,0,-1,0,0,0,0,1, 0,1,0,0,0,1,1,0,0,
       0,1,0,1,0,0,0,0,-1, 0,1,0,0,0,-1,-1,0,0,
       0,-1,0,0,0,1,-1,0,0, 0,-1,0,1,0,0,0,0,1,
       0,-1,0,0,0,-1,1,0,0, 0,-1,0,-1,0,0,0,0,-1,
       0,0,1,1,0,0,0,1,0, 0,0,1,0,1,0,-1,0,0,
       0,0,-1,-1,0,0,0,1,0, 0,0,-1,0,-1,0,1,0,0
    ], gl.TRIANGLES);
  }

  function createSphere(gl) {
    const vertices = [];
    const latBands = 8;
    const lonBands = 12;

    for (let lat = 0; lat < latBands; lat += 1) {
      const p0 = Math.PI * lat / latBands - Math.PI / 2;
      const p1 = Math.PI * (lat + 1) / latBands - Math.PI / 2;

      for (let lon = 0; lon < lonBands; lon += 1) {
        const a0 = Math.PI * 2 * lon / lonBands;
        const a1 = Math.PI * 2 * (lon + 1) / lonBands;
        const point = (p, a) => [Math.cos(p) * Math.cos(a), Math.sin(p), Math.cos(p) * Math.sin(a)];
        const a = point(p0, a0);
        const b = point(p1, a0);
        const c = point(p1, a1);
        const d = point(p0, a1);
        vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
      }
    }

    return createMesh(gl, vertices, gl.TRIANGLES);
  }

  function createGridDots(gl, radius, spacing) {
    const vertices = [];
    for (let x = -radius; x <= radius; x += spacing) {
      for (let z = -radius; z <= radius; z += spacing) {
        vertices.push(x, 0, z);
      }
    }
    return createMesh(gl, vertices, gl.POINTS);
  }

  function createPlane(gl, size) {
    return createMesh(gl, [
      -size,0,-size, size,0,-size, size,0,size,
      -size,0,-size, size,0,size, -size,0,size
    ], gl.TRIANGLES);
  }

  function modelMatrix(x, y, z, sx, sy, sz) {
    return new Float32Array([
      sx,0,0,0,
      0,sy,0,0,
      0,0,sz,0,
      x,y,z,1
    ]);
  }

  function removeViewTranslation(matrix) {
    const result = new Float32Array(matrix);
    result[12] = 0;
    result[13] = 0;
    result[14] = 0;
    return result;
  }

  class VRRenderer {
    constructor(canvas, world) {
      this.canvas = canvas;
      this.world = world;
      this.gl = null;
      this.program = null;
      this.skyProgram = null;
      this.session = null;
      this.referenceSpace = null;
      this.layer = null;
      this.frameTime = 0;
      this.error = null;
      this.locations = null;
      this.skyLocations = null;
      this.octahedron = null;
      this.sphere = null;
      this.floor = null;
      this.gridDots = null;
      this.vertexBuffer = null;
      this.running = false;
      this.currentFrame = null;
    }

    get isActive() {
      return this.running && !!this.session;
    }

    get isSupported() {
      return typeof navigator !== "undefined" &&
        !!navigator.xr &&
        typeof navigator.xr.isSessionSupported === "function";
    }

    initializeWebGL() {
      if (this.gl) return true;

      try {
        const gl = this.canvas.getContext("webgl", {
          alpha: false,
          antialias: true,
          depth: true,
          xrCompatible: true
        });

        if (!gl) throw new Error("WebGL is unavailable in this browser.");

        this.gl = gl;
        this.program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
        this.skyProgram = createProgram(gl, SKY_VERTEX_SHADER, SKY_FRAGMENT_SHADER);

        this.locations = {
          position: gl.getAttribLocation(this.program, "aPosition"),
          projection: gl.getUniformLocation(this.program, "uProjection"),
          view: gl.getUniformLocation(this.program, "uView"),
          model: gl.getUniformLocation(this.program, "uModel"),
          color: gl.getUniformLocation(this.program, "uColor"),
          glow: gl.getUniformLocation(this.program, "uGlow"),
          pointSize: gl.getUniformLocation(this.program, "uPointSize")
        };

        this.skyLocations = {
          position: gl.getAttribLocation(this.skyProgram, "aPosition")
        };

        this.octahedron = createOctahedron(gl);
        this.sphere = createSphere(gl);
        this.floor = createPlane(gl, GRID_RADIUS + 2);
        this.gridDots = createGridDots(gl, GRID_RADIUS, GRID_SPACING);

        this.vertexBuffer = gl.createBuffer();
        if (!this.vertexBuffer) throw new Error("Unable to create dynamic line buffer.");
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(6), gl.DYNAMIC_DRAW);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.CULL_FACE);

        this.canvas.addEventListener("webglcontextlost", event => {
          event.preventDefault();
          this.error = "WebGL context was lost.";
        });

        this.canvas.addEventListener("webglcontextrestored", () => {
          this.gl = null;
          this.program = null;
          this.skyProgram = null;
          this.locations = null;
          this.skyLocations = null;
          this.octahedron = null;
          this.sphere = null;
          this.floor = null;
          this.gridDots = null;
          this.vertexBuffer = null;
          this.error = null;
        });

        return true;
      } catch (error) {
        this.error = String(error && error.message || error);
        return false;
      }
    }

    async start() {
      if (this.isActive) return true;
      if (!this.isSupported) {
        throw new Error("WebXR is not available in this browser.");
      }

      if (!this.initializeWebGL()) {
        throw new Error(this.error || "WebGL initialization failed.");
      }

      let session;

      try {
        session = await navigator.xr.requestSession("immersive-vr", {
          optionalFeatures: ["local-floor", "hand-tracking"]
        });
      } catch (error) {
        throw new Error(this.describeXRError(error));
      }

      try {
        await this.gl.makeXRCompatible();

        const layer = new XRWebGLLayer(session, this.gl, {
          antialias: true,
          depth: true,
          framebufferScaleFactor: 1
        });

        session.updateRenderState({
          baseLayer: layer,
          depthNear: 0.01,
          depthFar: 100
        });

        let referenceSpace;

        try {
          referenceSpace = await session.requestReferenceSpace("local-floor");
        } catch {
          referenceSpace = await session.requestReferenceSpace("local");
        }

        this.session = session;
        this.layer = layer;
        this.referenceSpace = referenceSpace;
        this.running = true;
        this.frameTime = 0;
        this.error = null;

        session.addEventListener("end", () => this.handleSessionEnd(), { once: true });
        session.requestAnimationFrame((time, frame) => this.frame(time, frame));

        return true;
      } catch (error) {
        try {
          await session.end();
        } catch {}
        throw new Error(String(error && error.message || error));
      }
    }

    async stop() {
      if (!this.session) return;
      try {
        await this.session.end();
      } catch {
        this.handleSessionEnd();
      }
    }

    handleSessionEnd() {
      this.running = false;
      this.session = null;
      this.referenceSpace = null;
      this.layer = null;
      this.frameTime = 0;
      this.currentFrame = null;
    }

    describeXRError(error) {
      if (!error) return "Unknown WebXR error.";
      const name = error.name ? String(error.name) : "";
      const message = error.message ? String(error.message) : "";
      if (name === "SecurityError") return "WebXR permission or secure-context policy rejected the session.";
      if (name === "NotSupportedError") return "This browser or connected headset does not support immersive VR.";
      if (name === "InvalidStateError") return "Another immersive VR session is already active.";
      return message ? name + ": " + message : name || "Unable to start WebXR.";
    }

    worldPosition(entity) {
      const player = this.world.player;
      return [
        (entity.x - player.x) * WORLD_SCALE,
        (entity.z - player.z) * WORLD_SCALE,
        (entity.y - player.y) * WORLD_SCALE
      ];
    }

    handPosition(pose) {
      const player = this.world.player;
      const p = pose.transform.position;
      return [
        p.x,
        p.y,
        p.z
      ];
    }

    drawMesh(view, mesh, position, scale, color, glow = 0) {
      const gl = this.gl;
      gl.useProgram(this.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.locations.position);
      gl.uniformMatrix4fv(this.locations.projection, false, view.projectionMatrix);
      gl.uniformMatrix4fv(this.locations.view, false, view.viewMatrix);
      gl.uniformMatrix4fv(
        this.locations.model,
        false,
        modelMatrix(position[0], position[1], position[2], scale[0], scale[1], scale[2])
      );
      gl.uniform4fv(this.locations.color, color);
      gl.uniform1f(this.locations.glow, glow);
      gl.uniform1f(this.locations.pointSize, 1);
      gl.drawArrays(mesh.mode, 0, mesh.count);
    }

    drawLine(view, start, end, color, glow = 0) {
      const gl = this.gl;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([
        start[0], start[1], start[2],
        end[0], end[1], end[2]
      ]));

      this.drawMesh(
        view,
        { buffer: this.vertexBuffer, count: 2, mode: gl.LINES },
        [0,0,0],
        [1,1,1],
        color,
        glow
      );
    }

    drawSky() {
      const gl = this.gl;
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.useProgram(this.skyProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          -1,-1,
           3,-1,
          -1, 3
        ]),
        gl.STREAM_DRAW
      );
      gl.vertexAttribPointer(this.skyLocations.position, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.skyLocations.position);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.depthMask(true);
      gl.enable(gl.DEPTH_TEST);
    }

    drawFloor(view) {
      const gl = this.gl;
      this.drawMesh(
        view,
        this.floor,
        [0, FLOOR_Y, 0],
        [1,1,1],
        COLORS.floor
      );

      gl.useProgram(this.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.gridDots.buffer);
      gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.locations.position);
      gl.uniformMatrix4fv(this.locations.projection, false, view.projectionMatrix);
      gl.uniformMatrix4fv(this.locations.view, false, view.viewMatrix);
      gl.uniformMatrix4fv(this.locations.model, false, modelMatrix(0, FLOOR_Y + 0.006, 0, 1, 1, 1));
      gl.uniform4fv(this.locations.color, COLORS.white);
      gl.uniform1f(this.locations.glow, 0.2);
      gl.uniform1f(this.locations.pointSize, 3);
      gl.drawArrays(this.gl.POINTS, 0, this.gridDots.count);
    }

    drawEntity(view, entity) {
      const position = this.worldPosition(entity);

      if (entity.type === "metaball") {
        const scale = Math.max(0.025, entity.radius * WORLD_SCALE);
        this.drawMesh(view, this.sphere, position, [scale,scale,scale], COLORS.metaball, 0.05);
        return;
      }

      if (entity.type === "glitch") {
        const scale = Math.max(0.025, entity.radius * WORLD_SCALE);
        this.drawMesh(view, this.sphere, position, [scale,scale,scale], COLORS.glitch, 0.08);
        return;
      }

      const count = Math.min(32, Math.max(3, this.world.spikePointCount(entity)));
      const scale = Math.max(0.025, entity.radius * WORLD_SCALE);
      const direction = Number.isFinite(entity.direction) ? entity.direction : 0;

      for (let i = 0; i < count; i += 1) {
        const a = direction + Math.PI * 2 * i / count;
        const b = direction + Math.PI * 2 * (i + 1) / count;

        this.drawLine(
          view,
          [position[0] + Math.cos(a) * scale, position[1], position[2] + Math.sin(a) * scale],
          [position[0] + Math.cos(b) * scale, position[1], position[2] + Math.sin(b) * scale],
          COLORS.spike
        );
      }
    }

    updateInput(frame, pose) {
      const player = this.world.player;
      let thrustX = 0;
      let thrustY = 0;
      let thrustZ = 0;
      let leftHand = null;
      let rightHand = null;

      for (const source of this.session.inputSources) {
        if (!source.gripSpace) continue;

        const gripPose = frame.getPose(source.gripSpace, this.referenceSpace);
        if (!gripPose) continue;

        const p = gripPose.transform.position;
        const hand = {
          x: player.x + p.x / WORLD_SCALE,
          y: player.y + p.z / WORLD_SCALE,
          z: player.z + p.y / WORLD_SCALE,
          active: true
        };

        if (source.handedness === "left") leftHand = hand;
        if (source.handedness === "right") rightHand = hand;

        const axes = source.gamepad && source.gamepad.axes ? source.gamepad.axes : [];
        const x = Number.isFinite(axes[0]) ? axes[0] : 0;
        const y = Number.isFinite(axes[1]) ? axes[1] : 0;

        if (source.handedness === "left") {
          thrustX += x;
          thrustY -= y;
        } else if (source.handedness === "right") {
          thrustZ += x;
          thrustY -= y;
        }
      }

      const length = Math.hypot(thrustX, thrustY, thrustZ);
      if (length > 1) {
        thrustX /= length;
        thrustY /= length;
        thrustZ /= length;
      }

      const firstView = pose.views[0];
      let gazeAtLeftHand = false;

      if (leftHand && firstView) {
        const viewer = firstView.transform;
        const q = viewer.orientation;
        const forward = [
          2 * (q.x * q.z + q.w * q.y),
          2 * (q.y * q.z - q.w * q.x),
          1 - 2 * (q.x * q.x + q.y * q.y)
        ];

        const handX = (leftHand.x - player.x) * WORLD_SCALE;
        const handY = (leftHand.z - player.z) * WORLD_SCALE;
        const handZ = (leftHand.z - player.z) * WORLD_SCALE;
        const distance = Math.hypot(handX, handY, handZ);

        if (distance > 0.0001) {
          gazeAtLeftHand =
            (forward[0] * handX + forward[1] * handZ + forward[2] * handY) / distance > 0.82;
        }
      }

      this.world.setPlayerInput({
        thrust: { x: thrustX, y: thrustY, z: thrustZ },
        head: this.eulerFromQuaternion(firstView && firstView.transform.orientation),
        leftHand: leftHand || { x: player.x, y: player.y, z: player.z, active: false },
        rightHand: rightHand || { x: player.x, y: player.y, z: player.z, active: false },
        gazeAtLeftHand
      });
    }

    eulerFromQuaternion(q) {
      if (!q) return { pitch:0, yaw:0, roll:0 };

      const sinPitch = 2 * (q.w * q.x + q.y * q.z);
      const cosPitch = 1 - 2 * (q.x * q.x + q.y * q.y);
      const sinYaw = 2 * (q.w * q.y - q.z * q.x);
      const sinRoll = 2 * (q.w * q.z + q.x * q.y);
      const cosRoll = 1 - 2 * (q.y * q.y + q.z * q.z);

      return {
        pitch: Math.atan2(sinPitch, cosPitch),
        yaw: Math.abs(sinYaw) >= 1 ? Math.PI / 2 * Math.sign(sinYaw) : Math.asin(sinYaw),
        roll: Math.atan2(sinRoll, cosRoll)
      };
    }

    drawHands(view) {
      for (const source of this.session.inputSources) {
        if (!source.gripSpace) continue;

        const pose = this.currentFrame.getPose(source.gripSpace, this.referenceSpace);
        if (!pose) continue;

        const position = this.handPosition(pose);
        const color = source.handedness === "left" ? COLORS.handLeft : COLORS.handRight;

        this.drawMesh(
          view,
          this.octahedron,
          position,
          [0.07,0.07,0.07],
          color,
          0.12
        );

        if (source.handedness === "left") {
          const xp = Math.min(16, Math.max(0, this.world.player.xp));

          for (let i = 0; i < xp; i += 1) {
            const a = i * Math.PI * 2 / Math.max(1, xp);
            this.drawMesh(
              view,
              this.sphere,
              [
                position[0] + Math.cos(a) * 0.1,
                position[1] + Math.sin(a) * 0.1,
                position[2] - 0.08
              ],
              [0.009,0.009,0.009],
              COLORS.white,
              1
            );
          }
        }
      }
    }

    drawTrap(view) {
      const trap = this.world.player.trap;
      if (!trap || !trap.active) return;

      const center = this.worldPosition(trap.center);

      for (const point of trap.points) {
        this.drawLine(view, this.worldPosition(point), center, COLORS.white, 1);
      }
    }

    drawWorld(view) {
      this.drawSky();
      this.drawFloor(view);

      const player = this.world.player;

      if (player.captured && player.trap) {
        this.drawTrap(view);
      } else {
        for (const entity of this.world.metaballs) this.drawEntity(view, entity);
        for (const entity of this.world.spikes) this.drawEntity(view, entity);
        for (const entity of this.world.glitches) this.drawEntity(view, entity);

        this.drawMesh(
          view,
          this.octahedron,
          [0,0,0],
          [0.18,0.18,0.18],
          COLORS.player,
          0.08
        );
      }

      this.drawHands(view);
    }

    frame(time, frame) {
      if (!this.isActive) return;

      this.currentFrame = frame;

      try {
        const pose = frame.getViewerPose(this.referenceSpace);

        if (pose) {
          const delta = this.frameTime === 0
            ? 0
            : Math.min(0.05, Math.max(0, (time - this.frameTime) / 1000));

          this.frameTime = time;
          this.updateInput(frame, pose);
          this.world.step(delta);

          const gl = this.gl;

          gl.bindFramebuffer(gl.FRAMEBUFFER, this.layer.framebuffer);
          // Keep the XR framebuffer visibly non-black even if a later draw call fails.
          gl.clearColor(0.12,0.12,0.14,1);
          gl.clearDepth(1);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          for (const view of pose.views) {
            const viewport = this.layer.getViewport(view);

            gl.viewport(
              viewport.x,
              viewport.y,
              viewport.width,
              viewport.height
            );

            this.drawWorld(view);
          }
        }
      } catch (error) {
        this.error = String(error && error.message || error);
      } finally {
        this.currentFrame = null;

        if (this.isActive) {
          this.session.requestAnimationFrame(
            (nextTime, nextFrame) => this.frame(nextTime, nextFrame)
          );
        }
      }
    }
  }

  window.VRRenderer = VRRenderer;
})();