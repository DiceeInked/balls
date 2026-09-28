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

  class VRWorldState{
    constructor(){
      this.version=5;
      this.worldTime=0;
      this.accumulator=0;
      this.contactTimers=new Map();
      this.timerEvents=[];
      this.droppedSimulationTime=0;
      this.persistence={storageAvailable:false,saveCount:0,lastSaveWorldTime:null,lastLoadWorldTime:null,lastError:null,majorDirty:false};
      this.nextEntityId=1;
      this.entities=new Map();
      this.metaballs=[];
      this.spikes=[];
      this.glitches=[];
      this.activeEntities=[];
      this.player={
        id:this.allocateEntityId(),
        type:"player",
        x:0,
        y:0,
        z:0,
        heading:0,
        xp:16,
        captured:false,
        timer100:0
      };
      this.bounds={width:0,height:0};
      this.entities.set(this.player.id,this.player);
    }

    allocateEntityId(){
      return this.nextEntityId++;
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

    transferXp(source,destination,amount){
      if(!source||!destination||source.id===destination.id)return 0;
      const requested=this.normalizeXp(amount),available=this.normalizeXp(source.xp),moved=Math.min(requested,available);
      if(moved<=0)return 0;
      source.xp=available-moved; destination.xp=this.normalizeXp(destination.xp)+moved; return moved;
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
      for(const event of events){const entity=this.entities.get(event.entityId);if(event.type==="100-second"&&entity&&entity.type==="metaball")this.generateMetaballPickup(entity);}
      return events;
    }

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
        entity.x+=entity.vx*dt;
        entity.y+=entity.vy*dt;
        this.bounceFromWalls(entity);
        this.syncDirection(entity);
      }

      for(const entity of this.metaballs)this.advance100SecondTimer(entity,dt);
      this.advance100SecondTimer(this.player,dt);
      this.resolvePairCollisions();
      this.processTimerEvents();
    }

    step(dt){
      if(!Number.isFinite(dt)||dt<=0)return 0;

      let frameDelta=Math.min(dt,MAX_FRAME_DELTA);
      if(dt>MAX_FRAME_DELTA)this.droppedSimulationTime+=dt-MAX_FRAME_DELTA;
      this.accumulator+=frameDelta;

      let steps=0;
      while(this.accumulator>=FIXED_STEP&&steps<MAX_CATCH_UP_STEPS){
        this.simulateFixedStep(FIXED_STEP);
        this.accumulator-=FIXED_STEP;
        steps++;
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

      this.syncDirection(entity); if(bounced)this.gainMetaballBounceXp(entity);
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
        player:Object.assign({},this.player,{pickup:this.player.pickup?Object.assign({},this.player.pickup):undefined}),
        entities:Array.from(this.entities.values()).map(function(entity){
          return Object.assign({},entity,{pickup:entity.pickup?Object.assign({},entity.pickup):undefined});
        }),
        colors:Object.assign({},COLORS)
      };
    }

    restoreSnapshot(snapshot){
      if(!snapshot||typeof snapshot!=="object"||!Array.isArray(snapshot.entities)||!snapshot.player)return false;
      const sourcePlayer=snapshot.player;if(!Number.isFinite(sourcePlayer.id)||sourcePlayer.type!=="player")return false;
      this.entities.clear();for(const type of ENTITY_TYPES)this.collectionFor(type).length=0;this.contactTimers.clear();this.timerEvents.length=0;this.activeEntities.length=0;
      this.worldTime=Number.isFinite(snapshot.worldTime)&&snapshot.worldTime>=0?snapshot.worldTime:0;
      this.accumulator=Number.isFinite(snapshot.accumulator)&&snapshot.accumulator>=0?Math.min(snapshot.accumulator,FIXED_STEP):0;
      this.droppedSimulationTime=Number.isFinite(snapshot.droppedSimulationTime)&&snapshot.droppedSimulationTime>=0?snapshot.droppedSimulationTime:0;
      this.bounds={width:Number.isFinite(snapshot.bounds&&snapshot.bounds.width)?Math.max(0,snapshot.bounds.width):0,height:Number.isFinite(snapshot.bounds&&snapshot.bounds.height)?Math.max(0,snapshot.bounds.height):0};
      const player=Object.assign({},sourcePlayer);player.type="player";player.xp=this.normalizeXp(player.xp);player.captured=!!player.captured;player.timer100=Number.isFinite(player.timer100)&&player.timer100>=0?player.timer100%TIMER_INTERVAL:0;this.player=player;this.entities.set(player.id,player);
      let maxId=player.id;
      for(const source of snapshot.entities){
        if(!source||source.id===player.id||!ENTITY_TYPES.includes(source.type)||!Number.isFinite(source.id))continue;
        const entity=Object.assign({},source);entity.x=Number.isFinite(entity.x)?entity.x:0;entity.y=Number.isFinite(entity.y)?entity.y:0;entity.vx=Number.isFinite(entity.vx)?entity.vx:0;entity.vy=Number.isFinite(entity.vy)?entity.vy:0;entity.radius=Number.isFinite(entity.radius)&&entity.radius>0?entity.radius:Math.min(this.bounds.width,this.bounds.height)*PROTOTYPE_RADIUS_RATIO;entity.xp=this.normalizeXp(entity.xp);entity.speed=Math.hypot(entity.vx,entity.vy);entity.direction=entity.speed>0?Math.atan2(entity.vy,entity.vx):Number.isFinite(entity.direction)?entity.direction:0;entity.timer100=Number.isFinite(entity.timer100)&&entity.timer100>=0?entity.timer100%TIMER_INTERVAL:0;entity.remove=false;if(entity.type==="metaball")entity.pickup={storedXp:this.normalizeXp(entity.pickup&&entity.pickup.storedXp)};this.entities.set(entity.id,entity);this.collectionFor(entity.type).push(entity);maxId=Math.max(maxId,entity.id);
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