/* Minimal authoritative VR world state and movement prototype. */
(function(){
  const COLORS={meta:"#ffed00",spike:"#ff0054",glitch:"#00ffc7"};

  class VRWorldState{
    constructor(){
      this.version=2;
      this.worldTime=0;
      this.nextEntityId=1;
      this.entities=new Map();
      this.metaballs=[];
      this.spikes=[];
      this.glitches=[];
      this.player={id:this.allocateEntityId(),type:"player",x:0,y:0,z:0,heading:0,xp:16,captured:false};
      this.bounds={width:0,height:0};
      this.entities.set(this.player.id,this.player);
    }

    allocateEntityId(){return this.nextEntityId++;}

    register(entity,type){
      if(!entity.id) entity.id=this.allocateEntityId();
      entity.type=type;
      entity.remove=false;
      this.entities.set(entity.id,entity);
      const collection=this[type+"s"];
      if(Array.isArray(collection)&&!collection.includes(entity)) collection.push(entity);
      return entity;
    }

    unregister(entity){
      if(!entity||!entity.id)return;
      this.entities.delete(entity.id);
      for(const type of ["metaball","spike","glitch"]){
        const collection=this[type+"s"];
        const index=collection.indexOf(entity);
        if(index>=0)collection.splice(index,1);
      }
    }

    setBounds(width,height){
      this.bounds.width=Math.max(0,width);
      this.bounds.height=Math.max(0,height);
    }

    advanceTime(dt){
      if(Number.isFinite(dt)&&dt>0)this.worldTime+=dt;
    }

    step(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      const maxDt=Math.min(dt,0.1);
      this.advanceTime(maxDt);
      const all=[...this.metaballs,...this.spikes,...this.glitches];
      for(const entity of all){
        entity.x+=entity.vx*maxDt;
        entity.y+=entity.vy*maxDt;
        this.bounceFromWalls(entity);
      }
      this.resolvePairCollisions(all);
    }

    bounceFromWalls(entity){
      const r=entity.radius;
      if(entity.x-r<0){entity.x=r;entity.vx=Math.abs(entity.vx);}
      else if(entity.x+r>this.bounds.width){entity.x=this.bounds.width-r;entity.vx=-Math.abs(entity.vx);}
      if(entity.y-r<0){entity.y=r;entity.vy=Math.abs(entity.vy);}
      else if(entity.y+r>this.bounds.height){entity.y=this.bounds.height-r;entity.vy=-Math.abs(entity.vy);}
    }

    resolvePairCollisions(entities){
      for(let i=0;i<entities.length;i++){
        for(let j=i+1;j<entities.length;j++){
          const a=entities[i],b=entities[j];
          const dx=b.x-a.x,dy=b.y-a.y;
          const minDistance=a.radius+b.radius;
          const distance=Math.hypot(dx,dy);
          if(distance>=minDistance)continue;

          const nx=distance>0.000001?dx/distance:1;
          const ny=distance>0.000001?dy/distance:0;
          const overlap=minDistance-(distance||0);
          const separation=overlap*0.5+0.001;
          a.x-=nx*separation;a.y-=ny*separation;
          b.x+=nx*separation;b.y+=ny*separation;

          const relativeNormal=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
          if(relativeNormal<0){
            a.vx+=relativeNormal*nx;
            a.vy+=relativeNormal*ny;
            b.vx-=relativeNormal*nx;
            b.vy-=relativeNormal*ny;
          }
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
        entities:[...this.entities.values()].map(e=>({...e})),
        colors:{...COLORS}
      };
    }
  }

  window.VRWorldColors=COLORS;
  window.VRWorldState=VRWorldState;
  window.VRWorld=new VRWorldState();
})(/* global */);