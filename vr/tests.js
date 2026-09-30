(function(){
"use strict";
const results=[];
const EPS=1e-6;
function assert(ok,msg){if(!ok)throw new Error(msg);}
function near(a,b,e){return Math.abs(a-b)<=(e||EPS);}
function world(){
  const w=new window.VRWorldState();
  w.setBounds(1000,800);
  w.resetPrototypeWorld();
  return w;
}
function test(name,fn){
  try{fn();results.push({name:name,status:"PASS"});}
  catch(e){results.push({name:name,status:"FAIL",message:String(e&&e.message||e)});}
}
function run(){
  results.length=0;
  test("prototype reset",function(){
    const w=world();
    assert(w.player.x===500&&w.player.y===400,"Player is not centered.");
    assert(w.player.xp===16,"Player does not start at 16 XP.");
    assert(w.metaballs.length===1&&w.spikes.length===1&&w.glitches.length===1,"Prototype entity count is wrong.");
  });
  test("XP vertex mapping",function(){
    const w=world(),s=w.spikes[0];
    [[0,3],[4,4],[16,7],[128,32],[999,32]].forEach(function(pair){
      s.xp=pair[0];
      assert(w.spikePointCount(s)===pair[1],"Wrong vertex count for XP "+pair[0]+".");
    });
  });
  test("Metaball Spike immediate and timed drain",function(){
    const w=world(),m=w.metaballs[0],s=w.spikes[0];
    m.x=s.x;m.y=s.y;
    const before=m.xp;
    w.activeEntities=[m,s];
    w.processInteractionContacts(1/60);
    assert(m.xp===before-1&&s.xp===17,"Immediate drain is wrong.");
    w.processInteractionContacts(1);
    assert(m.xp===before-2&&s.xp===18,"One-second drain is wrong.");
  });
  test("contact reset after separation",function(){
    const w=world(),m=w.metaballs[0],s=w.spikes[0];
    m.x=s.x;m.y=s.y;w.processInteractionContacts(1/60);
    s.x=900;s.y=700;w.processInteractionContacts(1/60);
    assert(w.contactTimers.size===0,"Separated contact timer was retained.");
  });
  test("Glitch steering thresholds",function(){
    const w=world(),g=w.glitches[0];
    [16,32,64,128].forEach(function(xp){
      g.x=100;g.y=100;g.xp=xp;g.direction=0;g.vx=100;g.vy=0;g.speed=100;
      w.player.x=900;w.player.y=700;
      const before=g.direction;w.steerGlitch(g,1/60);
      const changed=Math.abs(g.direction-before);
      if(xp===16)assert(near(changed,0),"16 XP should not steer.");
      else assert(changed>0,"Higher XP should steer.");
    });
  });
  test("Glitch zero XP removal",function(){
    const w=world(),g=w.glitches[0],m=w.metaballs[0];
    g.x=m.x;g.y=m.y;g.xp=1;m.xp=16;
    w.activeEntities=[m,g];
    w.processInteractionContacts(1/60);w.finalizeRemovedEntities();
    assert(!w.glitches.includes(g),"Zero-XP Glitch survived.");
    assert(m.xp===17,"Glitch XP did not transfer.");
  });
  test("Spike split",function(){
    const w=world(),s=w.spikes[0];
    s.x=500;s.y=400;s.xp=40;s.vx=100;s.vy=0;s.direction=0;s.radius=50;
    w.splitEntity(s);
    const children=w.spikes.filter(function(x){return x!==s;});
    assert(s.remove,"Parent Spike was not removed.");
    assert(children.length===2,"Split did not create two children.");
    assert(children.every(function(x){return near(x.radius,27.5);}),"Child radius is not 55 percent.");
    assert(children.every(function(x){return x.collisionCooldown===8;}),"Child cooldown is wrong.");
    assert(children[0].xp+children[1].xp===40,"Child XP was not preserved.");
    assert(children[0].y!==children[1].y,"Children were not separated along the perpendicular axis.");
  });
  test("minimum Spike destruction",function(){
    const w=world(),s=w.spikes[0];s.xp=0;w.splitEntity(s);
    assert(s.remove,"Minimum Spike was not destroyed.");
    assert(w.spikes.length===1,"Minimum Spike created children.");
  });
  test("Glitch Spike consumption",function(){
    const w=world(),s=w.spikes[0],g=w.glitches[0];
    s.xp=21;s.x=g.x;s.y=g.y;
    w.consumeSpike(s,g);
    const child=w.glitches.find(function(x){return x!==g;});
    assert(s.remove,"Consumed Spike survived.");
    assert(g.xp===26,"Existing Glitch XP is wrong.");
    assert(child&&child.xp===11,"New Glitch XP is wrong.");
  });
  test("Metaball reproduction",function(){
    const w=world(),m=w.metaballs[0];
    m.xp=33;m.direction=0;m.vx=100;m.vy=0;m.speed=100;
    const child=w.tryReproduceMetaball(m);
    assert(child&&w.metaballs.length===2,"Metaball did not reproduce.");
    assert(m.xp===17&&child.xp===16,"Reproduction XP is wrong.");
    assert(near(child.direction,Math.PI),"Child direction is wrong.");
  });
  test("100 second timers",function(){
    const w=world(),m=w.metaballs[0];
    m.xp=20;w.advance100SecondTimer(m,100);w.advance100SecondTimer(w.player,100);
    assert(w.timerEvents.length===2,"Timer events were not queued.");
    w.processTimerEvents();
    assert(m.pickup.storedXp===2,"Pickup XP is wrong.");
    assert(w.player.xp===15,"Player timer drain is wrong.");
  });
  test("Player movement and capture lock",function(){
    const w=world();
    w.setPlayerInput({thrust:{x:1,y:1,z:1}});
    assert(near(Math.hypot(w.player.movementInput.x,w.player.movementInput.y,w.player.movementInput.z),1),"Thrust was not normalized.");
    const x=w.player.x;w.simulatePlayerMovement(1/60);assert(w.player.x>x,"Player did not move.");
    w.player.captured=true;w.player.vx=100;w.player.vy=100;w.player.vz=100;
    const before=w.player.x;w.simulatePlayerMovement(1);assert(w.player.x===before,"Captured Player moved.");
  });
  test("Player trap capture and release",function(){
    const w=world(),s=w.spikes[0];
    s.x=w.player.x;s.y=w.player.y;
    assert(w.capturePlayer(s),"Capture failed.");
    assert(w.player.trap&&w.player.trap.points.length===12,"Trap point count is wrong.");
    w.player.trap.points.forEach(function(p){
      p.x=w.player.trap.center.x;p.y=w.player.trap.center.y;p.z=w.player.trap.center.z;
    });
    w.updatePlayerTrap(1/60);
    assert(!w.player.captured&&!w.player.trap,"Player was not released.");
  });
  test("Persistence round trip",function(){
    const w=world();w.worldTime=12.5;w.player.xp=23;w.player.z=7;
    const restored=world();
    assert(restored.restoreSnapshot(w.snapshot()),"Snapshot restore failed.");
    assert(restored.worldTime===12.5&&restored.player.xp===23&&restored.player.z===7,"Restored state differs.");
    assert(restored.metaballs.length===1&&restored.spikes.length===1&&restored.glitches.length===1,"Restored collections differ.");
  });
  test("Malformed persistence rejection",function(){
    const w=world(),s=w.snapshot();s.entities.push(Object.assign({},s.entities[0]));
    assert(!w.restoreSnapshot(s),"Duplicate entity snapshot was accepted.");
  });
  test("Fixed step throttling",function(){
    const w=world(),steps=w.step(1);
    assert(steps===8,"One-second frame was not capped at 8 steps.");
    assert(w.droppedSimulationTime>0.8,"Dropped simulation time was not recorded.");
  });
  test("Debug snapshot isolation",function(){
    const w=world(),d=w.getDebugSnapshot();
    const x=w.player.x;d.player.x=99999;d.entities[0].xp=99999;
    assert(w.player.x===x&&w.player.xp===16,"Debug snapshot mutation changed authoritative state.");
    assert(d.events.length>0,"Debug event trace is empty.");
  });
  test("Debug event history bound",function(){
    const w=world();
    for(let i=0;i<100;i++)w.recordEvent("test",{i:i});
    assert(w.diagnostics.eventLog.length===64,"Event history exceeded its bound.");
  });
  test("Wall Spike split regression",function(){
    const w=world(),s=w.spikes[0];
    s.x=s.radius-1;s.y=400;s.vx=-100;s.vy=0;s.xp=20;s.collisionCooldown=0;
    w.bounceFromWalls(s);
    const children=w.spikes.filter(function(x){return !x.remove;});
    assert(s.remove,"Wall-hit Spike parent survived.");
    assert(children.length===2,"Wall split did not create two children.");
    assert(children.every(function(x){return x.collisionCooldown===8;}),"Wall children lack cooldown.");
    assert(children.every(function(x){return x.x>=x.radius-EPS;}),"Wall child spawned outside bounds.");
  });
  const passed=results.filter(function(x){return x.status==="PASS";}).length;
  const failed=results.filter(function(x){return x.status==="FAIL";}).length;
  return {passed:passed,failed:failed,total:results.length,ok:failed===0,results:results.slice()};
}
window.VRTestRunner={run:run};
})();