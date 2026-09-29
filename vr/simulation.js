/* Authoritative VR world state, persistence, and Metaball prototype systems. */
(function(){
  const COLORS={
    meta:"#ffED00FF",
    spike:"#FF0054FF",
    glitch:"#00FFC8FF"
  };

  const ENTITY_TYPES=["metaball","spike","glitch"];
  const COLLECTION_KEYS={
    metaball:"metaballs",
    spike:"spikes",
    glitch:"glitches"
  };
  const FIXED_STEP=1/60;
  const MAX_FRAME_DELTA=0.25;
  const MAX_CATCH_UP_STEPS=8;
  const CONTACT_INTERVAL=1;
  const TIMER_INTERVAL=100;
  const TIMER_EPSILON=1e-9;
  const PROTOTYPE_RADIUS_RATIO=0.055;
  const BOUNCE_XP=1;
  const REPRODUCTION_THRESHOLD=32;
  const PICKUP_MIN_XP=1;
  const PERSISTENCE_SCHEMA=1;
  const SPIKE_MIN_VERTICES=3;
  const SPIKE_POINT_CAP=32;
  const SPIKE_POINTS_PER_XP=4;
  const SPIKE_CHILD_RADIUS_SCALE=0.55;
  const SPIKE_COLLISION_COOLDOWN=8;
  const GLITCH_STEERING_CAP=128;
  const GLITCH_STEERING_RATE=20;
  const PLAYER_ACCELERATION=240;
  const PLAYER_MAX_SPEED=260;
  const PLAYER_DAMPING=3.5;
  const TRAP_POINT_COUNT=12;
  const TRAP_POINT_RADIUS=90;
  const TRAP_REPAIR_DISTANCE=18;
  const TRAP_HAND_REACH=34;
  const TRAP_DRAG_SPEED=8;

  class VRWorldState{
    constructor(){
      this.version=8;
      this.worldTime=0;
      this.accumulator=0;
      this.contactTimers=new Map();
      this.timerEvents=[];
      this.droppedSimulationTime=0;
      this.persistence={storageAvailable:false,saveCount:0,lastSaveWorldTime:null,lastLoadWorldTime:null,lastError:null,majorDirty:false};
      this.diagnostics={stepCount:0,errorCount:0,halted:false,lastError:null,errors:[]};
      this.nextEntityId=1;
      this.entities=new Map();
      this.metaballs=[];
      this.spikes=[];
      this.glitches=[];
      this.activeEntities=[];
      this.player={
        id:this.allocateEntityId(), type:"player", x:0, y:0, z:0,
        vx:0, vy:0, vz:0, heading:0, xp:16, radius:0, captured:false, timer100:0,
        movementInput:{x:0,y:0,z:0}, head:{pitch:0,yaw:0,roll:0},
        leftHand:{x:0,y:0,z:0,active:false}, rightHand:{x:0,y:0,z:0,active:false},
        gazeAtLeftHand:false, menuOpen:false, trap:null
      };
      this.bounds={width:0,height:0};
      this.entities.set(this.player.id,this.player);
    }

    allocateEntityId(){
      return this.nextEntityId++;
    }

    recordError(code,message,stage){
      const entry={
        code:String(code||"SIM-UNKNOWN-001"),
        message:String(message||"Unknown simulation error."),
        stage:String(stage||"unknown"),
        step:this.diagnostics.stepCount,
        worldTime:this.worldTime
      };
      this.diagnostics.lastError=entry;
      this.diagnostics.errorCount++;
      this.diagnostics.errors.unshift(entry);
      if(this.diagnostics.errors.length>12)this.diagnostics.errors.length=12;
    }

    getDiagnostics(){
      return{
        stepCount:this.diagnostics.stepCount,
        errorCount:this.diagnostics.errorCount,
        halted:this.diagnostics.halted,
        lastError:this.diagnostics.lastError,
        errors:this.diagnostics.errors.slice(0,8),
        entityCount:this.entities.size,
        metaballs:this.metaballs.length,
        spikes:this.spikes.length,
        glitches:this.glitches.length,
        playerId:this.player&&this.player.id
      };
    }

    collectionFor(type){
      return this[COLLECTION_KEYS[type]];
    }

    register(entity,type){
      if(!entity||!ENTITY_TYPES.includes(type))return null;
      if(!entity.id)entity.id=this.allocateEntityId();
      entity.type=type;
      entity.remove=false;
      entity.timer100=0;
      if(type==="spike")entity.collisionCooldown=Number.isFinite(entity.collisionCooldown)?Math.max(0,Math.floor(entity.collisionCooldown)):0;
      this.entities.set(entity.id,entity);
      const collection=this.collectionFor(type);
      if(!collection.includes(entity))collection.push(entity);
      return entity;
    }

    unregister(entity){
      if(!entity||!entity.id)return;
      this.entities.delete(entity.id);
      for(const [key,timer] of this.contactTimers){if(timer.aId===entity.id||timer.bId===entity.id)this.contactTimers.delete(key);}
      for(const type of ENTITY_TYPES){
        const collection=this.collectionFor(type);
        const index=collection.indexOf(entity);
        if(index>=0)collection.splice(index,1);
      }
    }

    setBounds(width,height){
      this.bounds.width=Math.max(0,Number(width)||0);
      this.bounds.height=Math.max(0,Number(height)||0);
      this.updateEntityBounds();
    }

    updateEntityBounds(){
      const {width,height}=this.bounds;
      if(width<=0||height<=0)return;

      if(!Number.isFinite(this.player.radius)||this.player.radius<=0)this.player.radius=Math.min(width,height)*PROTOTYPE_RADIUS_RATIO;
      this.clampEntityToBounds(this.player);

      for(const type of ENTITY_TYPES){
        for(const entity of this.collectionFor(type)){
          if(!Number.isFinite(entity.radius)||entity.radius<=0){
            entity.radius=Math.min(width,height)*PROTOTYPE_RADIUS_RATIO;
          }
          this.clampEntityToBounds(entity);
        }
      }
    }

    createPrototypeEntity(type,x,y,vx,vy){
      const speed=Math.hypot(vx,vy);
      const entity=this.register({
        x:Number.isFinite(x)?x:0,
        y:Number.isFinite(y)?y:0,
        vx:Number.isFinite(vx)?vx:0,
        vy:Number.isFinite(vy)?vy:0,
        direction:Math.atan2(vy,vx),
        speed,
        radius:Math.min(this.bounds.width,this.bounds.height)*PROTOTYPE_RADIUS_RATIO,
        xp:16,
        pickup:type==="metaball"?{storedXp:0}:undefined
      },type);
      if(entity)this.clampEntityToBounds(entity);
      return entity;
    }

    resetPrototypeEntities(){
      for(const type of ENTITY_TYPES){
        for(const entity of [...this.collectionFor(type)])this.unregister(entity);
      }

      const {width,height}=this.bounds;
      if(width<=0||height<=0)return false;

      this.createPrototypeEntity("metaball",width*.27,height*.35,82,57);
      this.createPrototypeEntity("spike",width*.52,height*.62,-71,64);
      this.createPrototypeEntity("glitch",width*.74,height*.38,-62,-79);
      return true;
    }


    resetPrototypeWorld(){
      for(const type of ENTITY_TYPES){
        for(const entity of [...this.collectionFor(type)])this.unregister(entity);
      }
      this.worldTime=0;
      this.accumulator=0;
      this.contactTimers.clear();
      this.timerEvents.length=0;
      this.droppedSimulationTime=0;
      this.nextEntityId=1;
      this.player={id:this.allocateEntityId(),type:"player",x:0,y:0,z:0,vx:0,vy:0,vz:0,heading:0,xp:16,radius:Math.min(this.bounds.width,this.bounds.height)*PROTOTYPE_RADIUS_RATIO,captured:false,timer100:0,movementInput:{x:0,y:0,z:0},head:{pitch:0,yaw:0,roll:0},leftHand:{x:0,y:0,z:0,active:false},rightHand:{x:0,y:0,z:0,active:false},gazeAtLeftHand:false,menuOpen:false,trap:null};
      this.entities.set(this.player.id,this.player);
      this.persistence.majorDirty=false;
      return this.resetPrototypeEntities();
    }
    clampEntityToBounds(entity){
      const {width,height}=this.bounds;
      const radius=Math.max(0,entity.radius||0);
      if(width<=0||height<=0)return;

      const minX=Math.min(radius,width*.5);
      const maxX=Math.max(minX,width-radius);
      const minY=Math.min(radius,height*.5);
      const maxY=Math.max(minY,height-radius);

      entity.x=Math.max(minX,Math.min(maxX,entity.x));
      entity.y=Math.max(minY,Math.min(maxY,entity.y));
    }

    normalizeXp(value){const xp=Math.floor(Number(value));return Number.isFinite(xp)?Math.max(0,xp):0;}

    setPlayerInput(input){
      const source=input&&typeof input==="object"?input:{};
      const thrust=source.thrust&&typeof source.thrust==="object"?source.thrust:{};
      const tx=Number.isFinite(thrust.x)?thrust.x:0,ty=Number.isFinite(thrust.y)?thrust.y:0,tz=Number.isFinite(thrust.z)?thrust.z:0;
      const magnitude=Math.hypot(tx,ty,tz),scale=magnitude>1?1/magnitude:1;
      this.player.movementInput={x:tx*scale,y:ty*scale,z:tz*scale};
      const head=source.head&&typeof source.head==="object"?source.head:{};
      this.player.head={pitch:Number.isFinite(head.pitch)?head.pitch:0,yaw:Number.isFinite(head.yaw)?head.yaw:0,roll:Number.isFinite(head.roll)?head.roll:0};
      const copyHand=(hand)=>({x:Number.isFinite(hand&&hand.x)?hand.x:0,y:Number.isFinite(hand&&hand.y)?hand.y:0,z:Number.isFinite(hand&&hand.z)?hand.z:0,active:!!(hand&&hand.active)});
      this.player.leftHand=copyHand(source.leftHand); this.player.rightHand=copyHand(source.rightHand);
      this.player.gazeAtLeftHand=!!source.gazeAtLeftHand; this.player.menuOpen=this.player.gazeAtLeftHand;
    }

    simulatePlayerMovement(dt){
      const player=this.player;if(!player||player.captured)return;
      const input=player.movementInput||{x:0,y:0,z:0};
      player.vx+=input.x*PLAYER_ACCELERATION*dt; player.vy+=input.y*PLAYER_ACCELERATION*dt; player.vz+=input.z*PLAYER_ACCELERATION*dt;
      const damping=Math.exp(-PLAYER_DAMPING*dt); player.vx*=damping; player.vy*=damping; player.vz*=damping;
      const speed=Math.hypot(player.vx,player.vy,player.vz);
      if(speed>PLAYER_MAX_SPEED){const scale=PLAYER_MAX_SPEED/speed;player.vx*=scale;player.vy*=scale;player.vz*=scale;}
      player.x+=player.vx*dt; player.y+=player.vy*dt; player.z+=player.vz*dt; this.clampEntityToBounds(player);
    }
    capturePlayer(spike){
      const player=this.player;
      if(!player||player.captured||!spike||spike.type!=="spike"||spike.remove)return false;
      const points=[];
      for(let i=0;i<TRAP_POINT_COUNT;i++){
        const angle=(Math.PI*2*i/TRAP_POINT_COUNT)+(i%2)*0.08;
        const radius=TRAP_POINT_RADIUS*(0.72+(i%3)*0.14);
        points.push({x:player.x+Math.cos(angle)*radius,y:player.y+Math.sin(angle)*radius,z:player.z+1,sealed:false});
      }
      player.captured=true;player.vx=0;player.vy=0;player.vz=0;player.movementInput={x:0,y:0,z:0};
      player.trap={active:true,sourceSpikeId:spike.id,center:{x:player.x,y:player.y,z:player.z+1},points:points};
      this.persistence.majorDirty=true;return true;
    }

    updatePlayerTrap(dt){
      const player=this.player,trap=player&&player.trap;
      if(!player||!player.captured||!trap||!trap.active)return;
      const hands=[player.leftHand,player.rightHand];
      const dragFactor=Math.min(1,Math.max(0,dt)*TRAP_DRAG_SPEED);
      for(const point of trap.points){
        if(point.sealed)continue;
        for(const hand of hands){
          if(!hand||!hand.active)continue;
          if(Math.hypot(hand.x-point.x,hand.y-point.y,hand.z-point.z)>TRAP_HAND_REACH)continue;
          point.x+=(trap.center.x-point.x)*dragFactor;point.y+=(trap.center.y-point.y)*dragFactor;point.z+=(trap.center.z-point.z)*dragFactor;break;
        }
        if(Math.hypot(point.x-trap.center.x,point.y-trap.center.y,point.z-trap.center.z)<=TRAP_REPAIR_DISTANCE){point.x=trap.center.x;point.y=trap.center.y;point.z=trap.center.z;point.sealed=true;}
      }
      if(trap.points.length>0&&trap.points.every(point=>point.sealed)){player.captured=false;player.trap=null;player.vx=0;player.vy=0;player.vz=0;this.persistence.majorDirty=true;}
    }

    spikePointCount(e){return e&&e.type==="spike"?Math.max(3,Math.min(32,3+Math.floor(this.normalizeXp(e.xp)/4))):3;}

    getSpikePoints(entity){
      if(!entity||entity.type!=="spike")return SPIKE_MIN_VERTICES;
      return Math.max(SPIKE_MIN_VERTICES,Math.min(SPIKE_POINT_CAP,SPIKE_MIN_VERTICES+Math.floor(this.normalizeXp(entity.xp)/SPIKE_POINTS_PER_XP)));
    }

    transferXp(source,destination,amount){
      if(!source||!destination||source.id===destination.id)return 0;
      const requested=this.normalizeXp(amount),available=this.normalizeXp(source.xp),moved=Math.min(requested,available);
      if(moved<=0)return 0;
      source.xp=available-moved; destination.xp=this.normalizeXp(destination.xp)+moved; return moved;
    }
    transferAndDirty(a,b,n){const m=this.transferXp(a,b,n);if(m)this.persistence.majorDirty=true;return m;}

    randomDirection(){return Math.random()*Math.PI*2;}

    glitchSteeringStrength(entity){
      const xp=this.normalizeXp(entity&&entity.xp);
      if(xp<=16)return 0;
      return Math.min(1,(xp-16)/(GLITCH_STEERING_CAP-16));
    }

    steerGlitch(entity,dt){
      if(!entity||entity.type!=="glitch"||entity.remove)return;
      const dx=this.player.x-entity.x,dy=this.player.y-entity.y;
      if(Math.hypot(dx,dy)<=0.000001)return;
      const target=Math.atan2(dy,dx),current=Number.isFinite(entity.direction)?entity.direction:Math.atan2(entity.vy,entity.vx),delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
      const strength=this.glitchSteeringStrength(entity);
      if(strength<=0)return;
      const turnFraction=1-Math.exp(-GLITCH_STEERING_RATE*strength*dt);
      const next=current+delta*turnFraction;
      const speed=Math.max(0,Number.isFinite(entity.speed)?entity.speed:Math.hypot(entity.vx,entity.vy));
      entity.direction=next;
      entity.vx=Math.cos(next)*speed;
      entity.vy=Math.sin(next)*speed;
    }

    gainMetaballBounceXp(entity){
      if(!entity||entity.type!=="metaball")return 0;
      entity.xp=this.normalizeXp(entity.xp)+BOUNCE_XP; this.tryReproduceMetaball(entity); return BOUNCE_XP;
    }

    tryReproduceMetaball(entity){
      if(!entity||entity.type!=="metaball"||this.normalizeXp(entity.xp)<=REPRODUCTION_THRESHOLD)return null;
      const direction=Number.isFinite(entity.direction)?entity.direction:Math.atan2(entity.vy,entity.vx),speed=Number.isFinite(entity.speed)?entity.speed:Math.hypot(entity.vx,entity.vy);
      const child=this.register({x:entity.x,y:entity.y,vx:-Math.cos(direction)*speed,vy:-Math.sin(direction)*speed,direction:direction+Math.PI,speed:speed,radius:entity.radius,xp:16,pickup:{storedXp:0}},"metaball");
      if(!child)return null;
      entity.xp=this.normalizeXp(entity.xp)-16; this.persistence.majorDirty=true; this.clampEntityToBounds(child); return child;
    }

    generateMetaballPickup(entity){
      if(!entity||entity.type!=="metaball")return 0;
      if(!entity.pickup)entity.pickup={storedXp:0};
      const amount=Math.max(PICKUP_MIN_XP,Math.floor(this.normalizeXp(entity.xp)*.1));
      entity.pickup.storedXp=this.normalizeXp(entity.pickup.storedXp)+amount; this.persistence.majorDirty=true; return amount;
    }

    processTimerEvents(){
      const events=this.consumeTimerEvents();
      for(const event of events){
        const entity=this.entities.get(event.entityId);
        if(event.type==="100-second"&&entity&&entity.type==="metaball")this.generateMetaballPickup(entity);
        if(event.type==="100-second"&&entity&&entity.type==="player"){entity.xp=Math.max(0,this.normalizeXp(entity.xp)-1);this.persistence.majorDirty=true;}
      }
      return events;
    }

    splitEntity(s){
      if(!s||s.remove)return;
      if(this.getSpikePoints(s)<=3){s.remove=true;this.persistence.majorDirty=true;return;}
      const n=this.normalizeXp(s.xp),a=Math.floor(n/2),b=n-a;
      const parentSpeed=Math.max(Math.hypot(s.vx,s.vy),1);
      const baseAngle=Number.isFinite(s.direction)?s.direction:Math.atan2(s.vy,s.vx);
      const spreadAngle=0.24;
      const separationAngle=baseAngle+Math.PI*0.5;
      const childRadius=Math.max((s.radius||0)*SPIKE_CHILD_RADIUS_SCALE,2.8);
      const separationDistance=Math.max(childRadius*1.15,2);
      for(const sign of [-1,1]){
        const offset=sign*separationDistance;
        const x=s.x+Math.cos(separationAngle)*offset;
        const y=s.y+Math.sin(separationAngle)*offset;
        const direction=baseAngle+sign*spreadAngle;
        const child=this.register({
          x,y,
          vx:Math.cos(direction)*parentSpeed,
          vy:Math.sin(direction)*parentSpeed,
          direction,
          speed:parentSpeed,
          radius:childRadius,
          xp:sign<0?a:b,
          collisionCooldown:SPIKE_COLLISION_COOLDOWN
        },"spike");
        if(child)this.clampEntityToBounds(child);
      }
      s.remove=true;
      this.persistence.majorDirty=true;
    }

    drainContact(source,destination,a,b,dt){if(!source||!destination||source.remove||destination.remove)return 0;const timer=this.beginContact(a,b);timer.elapsed+=dt;let moved=0;if(timer.transfers===0){moved=this.transferAndDirty(source,destination,1);timer.transfers=moved>0?1:0;}const intervals=Math.floor((timer.elapsed+TIMER_EPSILON)/CONTACT_INTERVAL);const extra=Math.max(0,intervals-Math.max(0,timer.transfers-1));if(extra>0){const n=this.transferAndDirty(source,destination,extra);timer.transfers+=n;moved+=n;}return moved;}

    consumeSpike(spike,glitch){if(!spike||!glitch||spike.remove||glitch.remove)return;const total=this.normalizeXp(spike.xp),existing=Math.floor(total/2),childXp=total-existing;this.transferAndDirty(spike,glitch,existing);const angle=this.randomDirection();const speed=Math.max(1,glitch.speed||Math.hypot(glitch.vx,glitch.vy));const child=this.register({x:glitch.x,y:glitch.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,direction:angle,speed,radius:glitch.radius,xp:childXp},"glitch");spike.remove=true;if(child)this.clampEntityToBounds(child);this.persistence.majorDirty=true;}

    processInteractionContacts(dt){const entities=this.activeEntities,active=new Set();for(let i=0;i<entities.length;i++){const a=entities[i];if(a.remove)continue;for(let j=i+1;j<entities.length;j++){const b=entities[j];if(b.remove)continue;const distance=Math.hypot(b.x-a.x,b.y-a.y);if(distance>=(a.radius||0)+(b.radius||0))continue;const key=Math.min(a.id,b.id)+":"+Math.max(a.id,b.id);active.add(key);if((a.type==="metaball"&&b.type==="spike")||(a.type==="spike"&&b.type==="metaball")){const meta=a.type==="metaball"?a:b,spike=a.type==="spike"?a:b;this.drainContact(meta,spike,meta,spike,dt);continue;}if((a.type==="glitch"&&b.type==="spike")||(a.type==="spike"&&b.type==="glitch")){const glitch=a.type==="glitch"?a:b,spike=a.type==="spike"?a:b;this.consumeSpike(spike,glitch);continue;}if((a.type==="metaball"&&b.type==="glitch")||(a.type==="glitch"&&b.type==="metaball")){const meta=a.type==="metaball"?a:b,glitch=a.type==="glitch"?a:b;this.drainContact(glitch,meta,glitch,meta,dt);if(glitch.xp<=0)glitch.remove=true;continue;}if(a.type==="spike"&&b.type==="spike"){if(a.collisionCooldown<=0&&b.collisionCooldown<=0){this.splitEntity(a);this.splitEntity(b);}}}}
      if(!this.player.captured){for(const spike of this.spikes){if(spike.remove)continue;const distance=Math.hypot(this.player.x-spike.x,this.player.y-spike.y);if(distance>=(spike.radius||0)+(this.player.radius||0))continue;const key=Math.min(spike.id,this.player.id)+":"+Math.max(spike.id,this.player.id);active.add(key);this.capturePlayer(spike);break;}}
      if(!this.player.captured){for(const glitch of this.glitches){if(glitch.remove)continue;const distance=Math.hypot(this.player.x-glitch.x,this.player.y-glitch.y);if(distance>=(glitch.radius||0)+(this.player.radius||0))continue;const key=Math.min(glitch.id,this.player.id)+":"+Math.max(glitch.id,this.player.id);active.add(key);this.drainContact(this.player,glitch,glitch,this.player,dt);}}
      for(const [key] of this.contactTimers){if(!active.has(key))this.contactTimers.delete(key);}}

    finalizeRemovedEntities(){for(const type of ENTITY_TYPES){for(const entity of [...this.collectionFor(type)]){if(entity.remove)this.unregister(entity);}}}

    setVelocity(entity,vx,vy){
      if(!entity)return;
      entity.vx=Number.isFinite(vx)?vx:0;
      entity.vy=Number.isFinite(vy)?vy:0;
      entity.speed=Math.hypot(entity.vx,entity.vy);
      if(entity.speed>0)entity.direction=Math.atan2(entity.vy,entity.vx);
    }

    syncDirection(entity){
      const speed=Math.hypot(entity.vx,entity.vy);
      entity.speed=speed;
      if(speed>0)entity.direction=Math.atan2(entity.vy,entity.vx);
    }

    advanceTime(dt){
      if(Number.isFinite(dt)&&dt>0)this.worldTime+=dt;
    }

    beginContact(a,b){
      if(!a||!b||!a.id||!b.id)return null;
      const first=a.id<b.id?a.id:b.id;
      const second=a.id<b.id?b.id:a.id;
      const key=first+":"+second;
      let timer=this.contactTimers.get(key);
      if(!timer){
        timer={aId:first,bId:second,elapsed:0,transfers:0};
        this.contactTimers.set(key,timer);
      }
      return timer;
    }

    endContact(a,b){
      if(!a||!b||!a.id||!b.id)return;
      const first=a.id<b.id?a.id:b.id;
      const second=a.id<b.id?b.id:a.id;
      this.contactTimers.delete(first+":"+second);
    }

    advanceContact(a,b,dt){
      const timer=this.beginContact(a,b);
      if(!timer||!Number.isFinite(dt)||dt<=0)return 0;
      timer.elapsed+=dt;
      const totalIntervals=Math.floor((timer.elapsed+TIMER_EPSILON)/CONTACT_INTERVAL);
      const newIntervals=Math.max(0,totalIntervals-timer.transfers);
      timer.transfers=totalIntervals;
      return newIntervals;
    }

    advance100SecondTimer(entity,dt){
      if(!entity||!Number.isFinite(dt)||dt<=0)return 0;
      entity.timer100=(Number.isFinite(entity.timer100)?entity.timer100:0)+dt;
      const intervals=Math.floor((entity.timer100+TIMER_EPSILON)/TIMER_INTERVAL);
      if(intervals<=0)return 0;
      entity.timer100-=intervals*TIMER_INTERVAL;
      for(let i=0;i<intervals;i++){
        this.timerEvents.push({type:"100-second",entityId:entity.id,worldTime:this.worldTime});
      }
      return intervals;
    }

    consumeTimerEvents(){
      const events=this.timerEvents.splice(0,this.timerEvents.length);
      return events;
    }

    simulateFixedStep(dt){
      this.advanceTime(dt);

      this.activeEntities.length=0;
      for(const type of ENTITY_TYPES){
        for(const entity of this.collectionFor(type)){
          if(!entity.remove)this.activeEntities.push(entity);
        }
      }

      for(const entity of this.activeEntities){
        if(entity.type==="spike"&&entity.collisionCooldown>0)entity.collisionCooldown--;
        this.steerGlitch(entity,dt);
        entity.x+=entity.vx*dt;
        entity.y+=entity.vy*dt;
        this.bounceFromWalls(entity);
        this.syncDirection(entity);
      }

      for(const entity of this.metaballs)this.advance100SecondTimer(entity,dt);
      this.advance100SecondTimer(this.player,dt);
      this.simulatePlayerMovement(dt);
      this.updatePlayerTrap(dt);
      this.processInteractionContacts(dt);
      this.resolvePairCollisions();
      this.processTimerEvents();
      this.finalizeRemovedEntities();
    }

    step(dt){
      if(this.diagnostics.halted)return 0;
      if(!Number.isFinite(dt)||dt<=0)return 0;

      let frameDelta=Math.min(dt,MAX_FRAME_DELTA);
      if(dt>MAX_FRAME_DELTA)this.droppedSimulationTime+=dt-MAX_FRAME_DELTA;
      this.accumulator+=frameDelta;

      let steps=0;
      while(this.accumulator>=FIXED_STEP&&steps<MAX_CATCH_UP_STEPS){
        try{
          this.simulateFixedStep(FIXED_STEP);
          this.diagnostics.stepCount++;
          this.accumulator-=FIXED_STEP;
          steps++;
        }catch(error){
          this.diagnostics.halted=true;
          this.accumulator=0;
          this.recordError(
            "SIM-STEP-001",
            String(error&&error.message||error),
            "fixed-step"
          );
          break;
        }
      }

      if(steps===MAX_CATCH_UP_STEPS&&this.accumulator>=FIXED_STEP){
        this.droppedSimulationTime+=this.accumulator;
        this.accumulator=0;
      }

      return steps;
    }

    bounceFromWalls(entity){
      const {width,height}=this.bounds;
      const radius=Math.max(0,entity.radius||0);
      if(width<=0||height<=0)return;

      const minX=Math.min(radius,width*.5);
      const maxX=Math.max(minX,width-radius);
      const minY=Math.min(radius,height*.5);
      const maxY=Math.max(minY,height-radius);

      let bounced=false;
      if(entity.x<minX){
        entity.x=minX;
        entity.vx=Math.abs(entity.vx); bounced=true;
      }else if(entity.x>maxX){
        entity.x=maxX;
        entity.vx=-Math.abs(entity.vx); bounced=true;
      }

      if(entity.y<minY){
        entity.y=minY;
        entity.vy=Math.abs(entity.vy); bounced=true;
      }else if(entity.y>maxY){
        entity.y=maxY;
        entity.vy=-Math.abs(entity.vy); bounced=true;
      }

      this.syncDirection(entity);
      if(bounced&&entity.type==="metaball")this.gainMetaballBounceXp(entity);
      if(bounced&&entity.type==="spike"&&entity.collisionCooldown<=0)this.splitEntity(entity);
      return bounced;
    }

    resolvePairCollisions(){
      const entities=this.activeEntities;
      for(let i=0;i<entities.length;i++){
        const a=entities[i];
        if(a.remove)continue;

        for(let j=i+1;j<entities.length;j++){
          const b=entities[j];
          if(b.remove)continue;

          const dx=b.x-a.x;
          const dy=b.y-a.y;
          const minDistance=(a.radius||0)+(b.radius||0);
          const distance=Math.hypot(dx,dy);
          if(distance>=minDistance)continue;
          const special=(a.type==="spike"||b.type==="spike")&&(a.type==="metaball"||a.type==="glitch"||b.type==="metaball"||b.type==="glitch")||((a.type==="metaball"&&b.type==="glitch")||(a.type==="glitch"&&b.type==="metaball"));
          if(special||a.type==="spike"&&b.type==="spike")continue;

          const nx=distance>0.000001?dx/distance:1;
          const ny=distance>0.000001?dy/distance:0;
          const overlap=minDistance-(distance||0);
          const separation=overlap*.5+.001;

          a.x-=nx*separation;
          a.y-=ny*separation;
          b.x+=nx*separation;
          b.y+=ny*separation;

          const relativeNormal=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
          if(relativeNormal<0){
            a.vx+=relativeNormal*nx;
            a.vy+=relativeNormal*ny;
            b.vx-=relativeNormal*nx;
            b.vy-=relativeNormal*ny;
          }

          this.clampEntityToBounds(a);
          this.clampEntityToBounds(b);
          this.syncDirection(a);
          this.syncDirection(b);
        }
      }
    }

    restoreTrapState(source){if(!source||source.active!==true||!Array.isArray(source.points)||source.points.length!==TRAP_POINT_COUNT)return null;const center=source.center;if(!center||![center.x,center.y,center.z].every(Number.isFinite))return null;const points=[];for(const point of source.points){if(!point||![point.x,point.y,point.z].every(Number.isFinite))return null;points.push({x:point.x,y:point.y,z:point.z,sealed:!!point.sealed});}return {active:true,sourceSpikeId:Number.isFinite(source.sourceSpikeId)?source.sourceSpikeId:null,center:{x:center.x,y:center.y,z:center.z},points};}

    snapshot(){
      return{
        version:this.version,
        persistenceSchema:PERSISTENCE_SCHEMA,
        worldTime:this.worldTime,
        accumulator:this.accumulator,
        nextEntityId:this.nextEntityId,
        droppedSimulationTime:this.droppedSimulationTime,
        contactTimers:Array.from(this.contactTimers.values()).map(function(timer){
          return{
            aId:timer.aId,
            bId:timer.bId,
            elapsed:timer.elapsed,
            transfers:timer.transfers
          };
        }),
        timerEvents:this.timerEvents.map(function(event){
          return{
            type:event.type,
            entityId:event.entityId,
            worldTime:event.worldTime
          };
        }),
        bounds:{width:this.bounds.width,height:this.bounds.height},
        player:Object.assign({},this.player,{movementInput:Object.assign({},this.player.movementInput),head:Object.assign({},this.player.head),leftHand:Object.assign({},this.player.leftHand),rightHand:Object.assign({},this.player.rightHand),trap:this.player.trap?{active:true,sourceSpikeId:this.player.trap.sourceSpikeId,center:Object.assign({},this.player.trap.center),points:this.player.trap.points.map(function(point){return Object.assign({},point);})}:null,pickup:this.player.pickup?Object.assign({},this.player.pickup):undefined}),
        entities:Array.from(this.entities.values()).map(function(entity){
          return Object.assign({},entity,{pickup:entity.pickup?Object.assign({},entity.pickup):undefined});
        }),
        colors:Object.assign({},COLORS)
      };
    }

    restoreSnapshot(snapshot){
      if(!snapshot||typeof snapshot!=="object"||!Array.isArray(snapshot.entities)||!snapshot.player)return false;
      const sourcePlayer=snapshot.player;if(!Number.isFinite(sourcePlayer.id)||sourcePlayer.type!=="player")return false;const ids=new Set([sourcePlayer.id]);let playerEntryCount=0;for(const source of snapshot.entities){if(!source||!Number.isFinite(source.id))return false;if(source.id===sourcePlayer.id){if(source.type!=="player"||++playerEntryCount>1)return false;continue;}if(!ENTITY_TYPES.includes(source.type)||ids.has(source.id))return false;ids.add(source.id);}
      this.entities.clear();for(const type of ENTITY_TYPES)this.collectionFor(type).length=0;this.contactTimers.clear();this.timerEvents.length=0;this.activeEntities.length=0;
      this.worldTime=Number.isFinite(snapshot.worldTime)&&snapshot.worldTime>=0?snapshot.worldTime:0;
      this.accumulator=Number.isFinite(snapshot.accumulator)&&snapshot.accumulator>=0?Math.min(snapshot.accumulator,FIXED_STEP):0;
      this.droppedSimulationTime=Number.isFinite(snapshot.droppedSimulationTime)&&snapshot.droppedSimulationTime>=0?snapshot.droppedSimulationTime:0;
      this.bounds={width:Number.isFinite(snapshot.bounds&&snapshot.bounds.width)?Math.max(0,snapshot.bounds.width):0,height:Number.isFinite(snapshot.bounds&&snapshot.bounds.height)?Math.max(0,snapshot.bounds.height):0};
      const player=Object.assign({},sourcePlayer);player.type="player";player.radius=Number.isFinite(player.radius)&&player.radius>0?player.radius:Math.min(this.bounds.width,this.bounds.height)*PROTOTYPE_RADIUS_RATIO;player.x=Number.isFinite(player.x)?player.x:0;player.y=Number.isFinite(player.y)?player.y:0;player.z=Number.isFinite(player.z)?player.z:0;player.vx=Number.isFinite(player.vx)?player.vx:0;player.vy=Number.isFinite(player.vy)?player.vy:0;player.vz=Number.isFinite(player.vz)?player.vz:0;player.xp=this.normalizeXp(player.xp);player.captured=!!player.captured;player.timer100=Number.isFinite(player.timer100)&&player.timer100>=0?player.timer100%TIMER_INTERVAL:0;player.movementInput={x:Number.isFinite(player.movementInput&&player.movementInput.x)?player.movementInput.x:0,y:Number.isFinite(player.movementInput&&player.movementInput.y)?player.movementInput.y:0,z:Number.isFinite(player.movementInput&&player.movementInput.z)?player.movementInput.z:0};const movementMagnitude=Math.hypot(player.movementInput.x,player.movementInput.y,player.movementInput.z);if(movementMagnitude>1){player.movementInput.x/=movementMagnitude;player.movementInput.y/=movementMagnitude;player.movementInput.z/=movementMagnitude;}player.head={pitch:Number.isFinite(player.head&&player.head.pitch)?player.head.pitch:0,yaw:Number.isFinite(player.head&&player.head.yaw)?player.head.yaw:0,roll:Number.isFinite(player.head&&player.head.roll)?player.head.roll:0};player.leftHand={x:Number.isFinite(player.leftHand&&player.leftHand.x)?player.leftHand.x:0,y:Number.isFinite(player.leftHand&&player.leftHand.y)?player.leftHand.y:0,z:Number.isFinite(player.leftHand&&player.leftHand.z)?player.leftHand.z:0,active:!!(player.leftHand&&player.leftHand.active)};player.rightHand={x:Number.isFinite(player.rightHand&&player.rightHand.x)?player.rightHand.x:0,y:Number.isFinite(player.rightHand&&player.rightHand.y)?player.rightHand.y:0,z:Number.isFinite(player.rightHand&&player.rightHand.z)?player.rightHand.z:0,active:!!(player.rightHand&&player.rightHand.active)};player.gazeAtLeftHand=!!player.gazeAtLeftHand;player.menuOpen=player.gazeAtLeftHand;player.trap=this.restoreTrapState(sourcePlayer.trap);if(player.captured&&!player.trap)player.captured=false;this.player=player;this.entities.set(player.id,player);
      let maxId=player.id;
      for(const source of snapshot.entities){
        if(!source||source.id===player.id||!ENTITY_TYPES.includes(source.type)||!Number.isFinite(source.id))continue;
        const entity=Object.assign({},source);entity.x=Number.isFinite(entity.x)?entity.x:0;entity.y=Number.isFinite(entity.y)?entity.y:0;entity.vx=Number.isFinite(entity.vx)?entity.vx:0;entity.vy=Number.isFinite(entity.vy)?entity.vy:0;entity.radius=Number.isFinite(entity.radius)&&entity.radius>0?entity.radius:Math.min(this.bounds.width,this.bounds.height)*PROTOTYPE_RADIUS_RATIO;entity.xp=this.normalizeXp(entity.xp);entity.speed=Math.hypot(entity.vx,entity.vy);entity.direction=entity.speed>0?Math.atan2(entity.vy,entity.vx):Number.isFinite(entity.direction)?entity.direction:0;entity.timer100=Number.isFinite(entity.timer100)&&entity.timer100>=0?entity.timer100%TIMER_INTERVAL:0;entity.remove=false;
        if(entity.type==="spike")entity.collisionCooldown=Number.isFinite(entity.collisionCooldown)&&entity.collisionCooldown>0?Math.floor(entity.collisionCooldown):0;
        if(entity.type==="metaball")entity.pickup={storedXp:this.normalizeXp(entity.pickup&&entity.pickup.storedXp)};this.entities.set(entity.id,entity);this.collectionFor(entity.type).push(entity);maxId=Math.max(maxId,entity.id);
      }
      const requestedNext=Number.isFinite(snapshot.nextEntityId)?Math.floor(snapshot.nextEntityId):1;this.nextEntityId=Math.max(1,requestedNext,maxId+1);
      if(Array.isArray(snapshot.contactTimers))for(const timer of snapshot.contactTimers){if(!timer||timer.aId===timer.bId||!this.entities.has(timer.aId)||!this.entities.has(timer.bId))continue;const elapsed=Number.isFinite(timer.elapsed)&&timer.elapsed>=0?timer.elapsed:0,transfers=Number.isFinite(timer.transfers)&&timer.transfers>=0?Math.floor(timer.transfers):Math.floor(elapsed),first=Math.min(timer.aId,timer.bId),second=Math.max(timer.aId,timer.bId);this.contactTimers.set(first+":"+second,{aId:first,bId:second,elapsed:elapsed,transfers:transfers});}
      if(Array.isArray(snapshot.timerEvents))for(const event of snapshot.timerEvents)if(event&&event.type==="100-second"&&this.entities.has(event.entityId))this.timerEvents.push({type:event.type,entityId:event.entityId,worldTime:Number.isFinite(event.worldTime)?event.worldTime:this.worldTime});
      this.persistence.majorDirty=false;this.updateEntityBounds();return true;
    }

    savePersistence(storage){
      try{if(!storage||typeof storage.setItem!=="function")throw new Error("Storage unavailable");storage.setItem("balls-vr-world",JSON.stringify({schema:PERSISTENCE_SCHEMA,savedAt:Date.now(),world:this.snapshot()}));this.persistence.storageAvailable=true;this.persistence.saveCount++;this.persistence.lastSaveWorldTime=this.worldTime;this.persistence.lastError=null;this.persistence.majorDirty=false;return true;}catch(error){this.persistence.lastError=String(error&&error.message||error);return false;}
    }

    loadPersistence(storage){
      try{if(!storage||typeof storage.getItem!=="function")throw new Error("Storage unavailable");const raw=storage.getItem("balls-vr-world");if(!raw){this.persistence.storageAvailable=true;return false;}const payload=JSON.parse(raw);if(!payload||payload.schema!==PERSISTENCE_SCHEMA||!payload.world)throw new Error("Invalid persistence snapshot");if(!this.restoreSnapshot(payload.world))throw new Error("Persistence snapshot rejected");this.persistence.storageAvailable=true;this.persistence.lastLoadWorldTime=this.worldTime;this.persistence.lastError=null;return true;}catch(error){this.persistence.lastError=String(error&&error.message||error);return false;}
    }

    clearPersistence(storage){try{if(storage&&typeof storage.removeItem==="function")storage.removeItem("balls-vr-world");return true;}catch(error){this.persistence.lastError=String(error&&error.message||error);return false;}}
  }

  window.VRWorldColors=COLORS;
  window.VRWorldState=VRWorldState;
  window.VRWorld=window.VRWorld||new VRWorldState();
})(/* global */);