(() => {
  const WORLD_SCALE = 0.01;
  const GRID_SPACING = 0.5;
  const GRID_RADIUS = 10;
  const FLOOR_Y = 0;
  const PLAYER_VISUAL_Y = 1.0;

  const COLORS = {
    metaball: [1, 0.929, 0, 1],
    spike: [1, 0, 0.329, 1],
    glitch: [0, 1, 0.784, 1],
    player: [0.231, 0.51, 0.965, 1],
    handLeft: [0, 1, 0.784, 1],
    handRight: [0.231, 0.51, 0.965, 1],
    white: [1, 1, 1, 1],
    black: [0, 0, 0, 1],
    floor: [0.035, 0.035, 0.045, 1],
    diagnostic: [0.98, 0.98, 1, 1],
    diagnosticAccent: [0, 1, 0.784, 1]
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
    "attribute vec3 aPosition;",
    "uniform mat4 uProjection;",
    "uniform mat4 uView;",
    "uniform mat4 uModel;",
    "varying float vHeight;",
    "void main(){",
    "  vHeight=aPosition.y;",
    "  gl_Position=uProjection*uView*uModel*vec4(aPosition,1.0);",
    "}"
  ].join("");

  const SKY_FRAGMENT_SHADER = [
    "precision mediump float;",
    "varying float vHeight;",
    "void main(){",
    "  float h=clamp(vHeight*0.5+0.5,0.0,1.0);",
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
      this.skySphere = null;
      this.running = false;
      this.currentFrame = null;
      this.resourcesReady = false;
      this.contextEventsAttached = false;
      this.xrFrameCount = 0;
      this.xrLastPoseTime = 0;
      this.diagnostics={lastError:null,errorCount:0,errors:[],lastStage:"idle",inputSourceCount:0,trackedInputCount:0,viewCount:0,referenceSpace:"none",framebufferWidth:0,framebufferHeight:0,poseMotion:0,poseRotation:0,posePosition:null,poseOrientation:null,selectCount:0,squeezeCount:0,inputSourceEvents:0,renderedObjects:0};
      this.startGateActive=false;
      this.onStartRequested=null;
    }

    setStartGateActive(active){this.startGateActive=active===true;}

    isStartButtonHit(inputSource,frame){
      if(!this.startGateActive||!inputSource||!frame||!this.referenceSpace)return false;
      const space=inputSource.targetRaySpace||inputSource.gripSpace;
      if(!space)return false;
      const pose=frame.getPose(space,this.referenceSpace);
      if(!pose)return false;
      const p=pose.transform.position;
      const q=pose.transform.orientation;
      const forward=[-2*(q.x*q.z+q.w*q.y),-2*(q.y*q.z-q.w*q.x),-1+2*(q.x*q.x+q.y*q.y)];
      if(Math.abs(forward[2])<0.000001)return false;
      const t=(-1.6-p.z)/forward[2];
      if(t<0)return false;
      const x=p.x+forward[0]*t;
      const y=p.y+forward[1]*t;
      return Math.abs(x)<=0.65&&Math.abs(y-0.65)<=0.24;
    }

    recordError(code,message,stage){
      const entry={code:String(code||"XR-UNKNOWN-001"),message:String(message||"Unknown renderer error."),stage:String(stage||"unknown"),frame:this.xrFrameCount,time:this.xrLastPoseTime||0};
      this.diagnostics.lastError=entry;
      this.diagnostics.errorCount+=1;
      this.diagnostics.lastStage=entry.stage;
      this.diagnostics.errors.unshift(entry);
      if(this.diagnostics.errors.length>12)this.diagnostics.errors.length=12;
    }

    getDiagnostics(){return{active:this.isActive,supported:this.isSupported,frameCount:this.xrFrameCount,lastPoseTime:this.xrLastPoseTime,inputSourceCount:this.diagnostics.inputSourceCount,trackedInputCount:this.diagnostics.trackedInputCount,viewCount:this.diagnostics.viewCount,lastStage:this.diagnostics.lastStage,referenceSpace:this.diagnostics.referenceSpace,framebufferWidth:this.diagnostics.framebufferWidth,framebufferHeight:this.diagnostics.framebufferHeight,poseMotion:this.diagnostics.poseMotion,poseRotation:this.diagnostics.poseRotation,posePosition:this.diagnostics.posePosition,poseOrientation:this.diagnostics.poseOrientation,selectCount:this.diagnostics.selectCount,squeezeCount:this.diagnostics.squeezeCount,inputSourceEvents:this.diagnostics.inputSourceEvents,renderedObjects:this.diagnostics.renderedObjects,errorCount:this.diagnostics.errorCount,lastError:this.diagnostics.lastError,errors:this.diagnostics.errors.slice(0,8)};}

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
        // Do not build shaders/buffers here. makeXRCompatible() can reconfigure
        // the context, so all WebGL resources are created only after XR
        // compatibility has been established.
        const gl = this.canvas.getContext("webgl", {
          alpha: false,
          antialias: false,
          depth: true,
          stencil: false,
          xrCompatible: true,
          premultipliedAlpha: true
        });

        if (!gl) throw new Error("WebGL is unavailable in this browser.");

        this.gl = gl;
        this.resourcesReady = false;

        if (!this.contextEventsAttached) {
          this.contextEventsAttached = true;

          this.canvas.addEventListener("webglcontextlost", event => {
            event.preventDefault();
            this.resourcesReady = false;
            this.recordError("GL-CONTEXT-001","WebGL context was lost while entering or running VR.","webgl-context");
            this.error = "WebGL context was lost while entering or running VR.";
          });

          this.canvas.addEventListener("webglcontextrestored", () => {
            this.resourcesReady = false;
            this.recordError("GL-CONTEXT-002","WebGL context restored; rebuilding XR rendering resources.","webgl-context");
            this.error = "WebGL context restored; rebuilding XR rendering resources.";
          });
        }

        return true;
      } catch (error) {
        const message=String(error&&error.message||error);
        this.recordError("GL-INIT-001",message,"webgl-init");
        this.error=message;
        return false;
      }
    }

    buildResources() {
      const gl = this.gl;
      if (!gl) throw new Error("WebGL context is unavailable.");

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
        position: gl.getAttribLocation(this.skyProgram, "aPosition"),
        projection: gl.getUniformLocation(this.skyProgram, "uProjection"),
        view: gl.getUniformLocation(this.skyProgram, "uView"),
        model: gl.getUniformLocation(this.skyProgram, "uModel")
      };

      this.octahedron = createOctahedron(gl);
      this.sphere = createSphere(gl);
      this.skySphere = createSphere(gl);
      this.floor = createPlane(gl, GRID_RADIUS + 2);
      this.gridDots = createGridDots(gl, GRID_RADIUS, GRID_SPACING);

      this.vertexBuffer = gl.createBuffer();
      if (!this.vertexBuffer) throw new Error("Unable to create dynamic line buffer.");
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(6), gl.DYNAMIC_DRAW);

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.disable(gl.SCISSOR_TEST);

      this.resourcesReady = true;
    }
    async start() {
      if (this.isActive) return true;
      if (!this.isSupported) {
        const message="WebXR is not available in this browser.";
        this.recordError("XR-SUPPORT-001",message,"support-check");
        throw new Error(message);
      }

      if (!this.initializeWebGL()) {
        const message=this.error || "WebGL initialization failed.";
        this.recordError("GL-INIT-002",message,"webgl-init");
        throw new Error(message);
      }

      let session;

      try {
        session = await navigator.xr.requestSession("immersive-vr", {
          optionalFeatures: ["local-floor", "hand-tracking"]
        });
      } catch (error) {
        const message=this.describeXRError(error);
        this.recordError("XR-SESSION-001",message,"session-request");
        throw new Error(message);
      }

      try {
        await this.gl.makeXRCompatible();

        // makeXRCompatible() may reconfigure the backing graphics context.
        // Rebuild every shader/buffer after it resolves, never before.
        if (!this.resourcesReady) this.buildResources();

        const layer = new XRWebGLLayer(session, this.gl, {
          alpha: false,
          antialias: false,
          depth: true,
          stencil: false,
          framebufferScaleFactor: 1,
          ignoreDepthValues: false
        });

        if (!layer.framebuffer) {
          throw new Error("XRWebGLLayer did not provide a framebuffer.");
        }
        if (layer.framebufferWidth < 1 || layer.framebufferHeight < 1) {
          throw new Error("XR framebuffer has an invalid size.");
        }

        session.updateRenderState({
          baseLayer: layer,
          depthNear: 0.01,
          depthFar: 100
        });

        let referenceSpace;
        let referenceSpaceType="local-floor";

        try {
          referenceSpace = await session.requestReferenceSpace("local-floor");
        } catch {
          referenceSpaceType="local";
          referenceSpace = await session.requestReferenceSpace("local");
        }

        this.session = session;
        this.layer = layer;
        this.referenceSpace = referenceSpace;
        this.running = true;
        this.startGateActive=true;
        this.diagnostics.lastStage="session-active";
        this.diagnostics.inputSourceCount=session.inputSources.length;
        this.diagnostics.trackedInputCount=0;
        this.diagnostics.viewCount=0;
        this.diagnostics.poseMotion=0;
        this.diagnostics.poseRotation=0;
        this.diagnostics.posePosition=null;
        this.diagnostics.poseOrientation=null;
        this.diagnostics.referenceSpace=referenceSpaceType;
        this.frameTime = 0;
        this.error = null;

        session.addEventListener("end", () => this.handleSessionEnd(), { once: true });
        session.addEventListener("inputsourceschange", () => {
          this.diagnostics.inputSourceCount=session.inputSources.length;
          this.diagnostics.inputSourceEvents++;
        });
        session.addEventListener("selectstart", event => {
          this.diagnostics.selectCount++;
          if(this.isStartButtonHit(event.inputSource,event.frame)&&typeof this.onStartRequested==="function")this.onStartRequested();
        });
        session.addEventListener("squeezestart", event => {
          this.diagnostics.squeezeCount++;
          if(this.isStartButtonHit(event.inputSource,event.frame)&&typeof this.onStartRequested==="function")this.onStartRequested();
        });
        session.requestAnimationFrame((time, frame) => this.frame(time, frame));

        return true;
      } catch (error) {
        const message = String(error && error.message || error);
        this.recordError("XR-START-001",message,"session-start");
        this.error = message;
        try {
          await session.end();
        } catch {}
        throw new Error(message);
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
      this.startGateActive=false;
      this.diagnostics.lastStage="session-ended";
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
      // WebXR looks down -Z. The simulation's Y axis is the second
      // horizontal gameplay axis, so positive simulation Y maps toward
      // negative XR Z rather than behind the viewer.
      const player = this.world.player;
      return [
        (entity.x - player.x) * WORLD_SCALE,
        (entity.z - player.z) * WORLD_SCALE,
        -(entity.y - player.y) * WORLD_SCALE
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

    drawSky(view) {
      const gl = this.gl;
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.useProgram(this.skyProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.skySphere.buffer);
      gl.vertexAttribPointer(this.skyLocations.position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.skyLocations.position);
      gl.uniformMatrix4fv(this.skyLocations.projection, false, view.projectionMatrix);
      gl.uniformMatrix4fv(
        this.skyLocations.view,
        false,
        removeViewTranslation(view.viewMatrix)
      );
      gl.uniformMatrix4fv(
        this.skyLocations.model,
        false,
        modelMatrix(0, 0, 0, 45, 45, 45)
      );
      gl.drawArrays(this.skySphere.mode, 0, this.skySphere.count);
      gl.depthMask(true);
      gl.enable(gl.DEPTH_TEST);
    }

    drawFloor(view) {
      const gl = this.gl;
      const player=this.world.player;
      const floorY=(FLOOR_Y-player.z)*WORLD_SCALE;
      const floorX=-player.x*WORLD_SCALE;
      const floorZ=player.y*WORLD_SCALE;
      this.drawMesh(view,this.floor,[floorX,floorY,floorZ],[1,1,1],COLORS.floor);

      gl.useProgram(this.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.gridDots.buffer);
      gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.locations.position);
      gl.uniformMatrix4fv(this.locations.projection, false, view.projectionMatrix);
      gl.uniformMatrix4fv(this.locations.view, false, view.viewMatrix);
      gl.uniformMatrix4fv(this.locations.model, false, modelMatrix(floorX, floorY + 0.006, floorZ, 1, 1, 1));
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
        const inputSpace = source.gripSpace || source.targetRaySpace;
        if (!inputSpace) continue;

        const gripPose = frame.getPose(inputSpace, this.referenceSpace);
        if (!gripPose) continue;

        this.diagnostics.trackedInputCount++;
        const p = gripPose.transform.position;
        const hand = {
          x: player.x + p.x / WORLD_SCALE,
          y: player.y - p.z / WORLD_SCALE,
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
          -2 * (q.x * q.z + q.w * q.y),
          -2 * (q.y * q.z - q.w * q.x),
          -1 + 2 * (q.x * q.x + q.y * q.y)
        ];

        const handX = (leftHand.x - player.x) * WORLD_SCALE;
        const handY = (leftHand.z - player.z) * WORLD_SCALE;
        const handZ = (leftHand.y - player.y) * WORLD_SCALE;
        const distance = Math.hypot(handX, handY, handZ);

        if (distance > 0.0001) {
          gazeAtLeftHand =
            (forward[0] * handX + forward[1] * handZ + forward[2] * handY) / distance > 0.82;
        }
      }

      this.diagnostics.inputSourceCount=this.session.inputSources.length;
      this.diagnostics.lastStage="input";
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
        const inputSpace = source.gripSpace || source.targetRaySpace;
        if (!inputSpace) continue;

        const pose = this.currentFrame.getPose(inputSpace, this.referenceSpace);
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

    drawDiagnosticProbe(view){
      const probe=[0,1.35,-1.6];
      this.drawMesh(view,this.octahedron,probe,[0.16,0.16,0.16],COLORS.diagnosticAccent,0.35);
      this.drawLine(view,[probe[0]-0.3,probe[1],probe[2]],[probe[0]+0.3,probe[1],probe[2]],COLORS.diagnostic,0.25);
      this.drawLine(view,[probe[0],probe[1]-0.3,probe[2]],[probe[0],probe[1]+0.3,probe[2]],COLORS.diagnostic,0.25);
      this.drawLine(view,[probe[0],probe[1],probe[2]-0.3],[probe[0],probe[1],probe[2]+0.3],COLORS.diagnostic,0.25);
    }

    drawStartGate(view){
      this.drawDiagnosticProbe(view);
      const button=[0,0.65,-1.6];
      this.drawMesh(view,this.octahedron,button,[0.32,0.12,0.32],COLORS.diagnosticAccent,0.45);
      this.drawLine(view,[-0.65,0.65,-1.6],[0.65,0.65,-1.6],COLORS.diagnostic,0.2);
      this.drawLine(view,[0,0.41,-1.6],[0,0.89,-1.6],COLORS.diagnostic,0.2);
    }

    drawWorld(view) {
      this.drawSky(view);
      this.drawFloor(view);

      const player = this.world.player;
      this.diagnostics.renderedObjects=0;

      if (this.startGateActive) {
        this.drawStartGate(view);
        this.diagnostics.renderedObjects=2;
      } else if (player.captured && player.trap) {
        this.drawTrap(view);
      } else {
        for (const entity of this.world.metaballs) { this.drawEntity(view, entity); this.diagnostics.renderedObjects++; }
        for (const entity of this.world.spikes) { this.drawEntity(view, entity); this.diagnostics.renderedObjects++; }
        for (const entity of this.world.glitches) { this.drawEntity(view, entity); this.diagnostics.renderedObjects++; }

        // Put the Player at the XR reference-space origin. The headset's
        // height and position are handled by the XR view transform.
        this.drawMesh(
          view,
          this.octahedron,
          [0, PLAYER_VISUAL_Y, 0],
          [0.18,0.18,0.18],
          COLORS.player,
          0.08
        );
      }

      this.drawHands(view);
      this.diagnostics.lastStage="rendered";
    }

    frame(time, frame) {
      if (!this.isActive) return;

      const session = frame.session;
      this.diagnostics.lastStage="frame";
      session.requestAnimationFrame((nextTime, nextFrame) => {
        this.frame(nextTime, nextFrame);
      });

      this.currentFrame = frame;
      this.xrFrameCount += 1;
      this.xrLastPoseTime = time;

      try {
        const pose = frame.getViewerPose(this.referenceSpace);
        if (!pose || pose.views.length === 0) {
          this.recordError("XR-POSE-001","WebXR returned no viewer views for the current frame.","pose");
          return;
        }

        const gl = this.gl;
        const layer = session.renderState.baseLayer;
        this.diagnostics.viewCount=pose.views.length;
        this.diagnostics.framebufferWidth=layer && layer.framebufferWidth || 0;
        this.diagnostics.framebufferHeight=layer && layer.framebufferHeight || 0;
        const viewerPosition=pose.transform.position;
        const viewerOrientation=pose.transform.orientation;
        if(this.diagnostics.posePosition){
          const previous=this.diagnostics.posePosition;
          this.diagnostics.poseMotion=Math.hypot(viewerPosition.x-previous.x,viewerPosition.y-previous.y,viewerPosition.z-previous.z);
        }
        if(this.diagnostics.poseOrientation){
          const previous=this.diagnostics.poseOrientation;
          const dot=Math.abs(viewerOrientation.x*previous.x+viewerOrientation.y*previous.y+viewerOrientation.z*previous.z+viewerOrientation.w*previous.w);
          this.diagnostics.poseRotation=2*Math.acos(Math.min(1,dot));
        }
        this.diagnostics.posePosition={x:viewerPosition.x,y:viewerPosition.y,z:viewerPosition.z};
        this.diagnostics.poseOrientation={x:viewerOrientation.x,y:viewerOrientation.y,z:viewerOrientation.z,w:viewerOrientation.w};

        if (!layer || !layer.framebuffer) {
          const message="XR frame has no active base-layer framebuffer.";
          this.recordError("XR-FRAMEBUFFER-001",message,"framebuffer");
          throw new Error(message);
        }

        if (!this.resourcesReady) {
          try {
            this.buildResources();
          } catch (error) {
            const message=String(error&&error.message||error);
            this.recordError("GL-RESOURCE-001",message,"resource-build");
            throw error;
          }
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);

        gl.clearColor(0.12, 0.12, 0.14, 1);
        gl.clearDepth(1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        try {
          this.updateInput(frame, pose);
        } catch (inputError) {
          const message=String(inputError&&inputError.message||inputError);
          this.recordError("XR-INPUT-001",message,"input");
          this.error=message;
        }

        for (const view of pose.views) {
          const viewport = layer.getViewport(view);
          if (!viewport || viewport.width < 1 || viewport.height < 1) {
            const message="XR returned an invalid eye viewport.";
            this.recordError("XR-VIEWPORT-001",message,"viewport");
            throw new Error(message);
          }

          gl.viewport(
            viewport.x,
            viewport.y,
            viewport.width,
            viewport.height
          );

          try {
            this.drawWorld(view);
          } catch (renderError) {
            this.error = "XR render: " +
              String(renderError && renderError.message || renderError);
          }
        }

        gl.depthMask(true);
        gl.flush();

        const glError = gl.getError();
        if (glError !== gl.NO_ERROR) {
          const hex=glError.toString(16);
          const message="WebGL XR frame error 0x"+hex+".";
          this.recordError("GL-ERROR-"+hex,message,"webgl");
          this.error=message;
        }
      } catch (error) {
        this.error = "XR frame: " +
          String(error && error.message || error);
      } finally {
        this.currentFrame = null;
      }
    }
  }

  window.VRRenderer = VRRenderer;
})();