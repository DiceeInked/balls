/* Authoritative VR world state and movement prototype. */
(function(){
  const COLORS={
    meta:"#ffED00FF",
    spike:"#FF0054FF",
    glitch:"#00FFC8FF"
  };

  const ENTITY_TYPES=["metaball","spike","glitch"];
  const MAX_SIMULATION_STEP=0.1;
  const PROTOTYPE_RADIUS_RATIO=0.055;

  class VRWorldState{
    constructor(){
      this.version=3;
      this.worldTime=0;
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
        captured:false
      };
      this.bounds={width:0,height:0};
      this.entities.set(this.player.id,this.player);
    }

    allocateEntityId(){
      return this.nextEntityId++;
    }

    register(entity,type){
      if(!entity||!ENTITY_TYPES.includes(type))return null;
      if(!entity.id)entity.id=this.allocateEntityId();
      entity.type=type;
      entity.remove=false;
      this.entities.set(entity.id,entity);
      const collection=this[type+"s"];
      if(!collection.includes(entity))collection.push(entity);
      return entity;
    }

    unregister(entity){
      if(!entity||!entity.id)return;
      this.entities.delete(entity.id);
      for(const type of ENTITY_TYPES){
        const collection=this[type+"s"];
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
        for(const entity of this[type+"s"]){
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
        xp:16
      },type);
      if(entity)this.clampEntityToBounds(entity);
      return entity;
    }

    resetPrototypeEntities(){
      for(const type of ENTITY_TYPES){
        for(const entity of [...this[type+"s"]])this.unregister(entity);
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

    step(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      const simulationDt=Math.min(dt,MAX_SIMULATION_STEP);
      this.advanceTime(simulationDt);

      this.activeEntities.length=0;
      for(const type of ENTITY_TYPES){
        for(const entity of this[type+"s"]){
          if(!entity.remove)this.activeEntities.push(entity);
        }
      }

      for(const entity of this.activeEntities){
        entity.x+=entity.vx*simulationDt;
        entity.y+=entity.vy*simulationDt;
        this.bounceFromWalls(entity);
        this.syncDirection(entity);
      }

      this.resolvePairCollisions();
    }

    bounceFromWalls(entity){
      const {width,height}=this.bounds;
      const radius=Math.max(0,entity.radius||0);
      if(width<=0||height<=0)return;

      const minX=Math.min(radius,width*.5);
      const maxX=Math.max(minX,width-radius);
      const minY=Math.min(radius,height*.5);
      const maxY=Math.max(minY,height-radius);

      if(entity.x<minX){
        entity.x=minX;
        entity.vx=Math.abs(entity.vx);
      }else if(entity.x>maxX){
        entity.x=maxX;
        entity.vx=-Math.abs(entity.vx);
      }

      if(entity.y<minY){
        entity.y=minY;
        entity.vy=Math.abs(entity.vy);
      }else if(entity.y>maxY){
        entity.y=maxY;
        entity.vy=-Math.abs(entity.vy);
      }

      this.syncDirection(entity);
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
        worldTime:this.worldTime,
        nextEntityId:this.nextEntityId,
        bounds:{...this.bounds},
        player:{...this.player},
        entities:[...this.entities.values()].map(entity=>({...entity})),
        colors:{...COLORS}
      };
    }
  }

  window.VRWorldColors=COLORS;
  window.VRWorldState=VRWorldState;
  window.VRWorld=window.VRWorld||new VRWorldState();
})(/* global */);