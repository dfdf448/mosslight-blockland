// 温顺动物的漫游和碰撞独立于画面，方便验证地形、围栏与存档。
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function solid(w,x,y,z){return !!w.get(Math.floor(x),Math.floor(y),Math.floor(z));}
export function animalBlocked(w,a,x=a.x,y=a.y,z=a.z){const radius=a.species==='cow'?.39:.33,height=a.species==='cow'?1.12:.95;for(const dx of [-radius,radius])for(const dz of [-radius,radius])for(const dy of [.04,.5,height])if(solid(w,x+dx,y+dy,z+dz))return true;return false;}
function freeSpot(w,a,x,z){for(let r=0;r<6;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(r&&Math.abs(dx)!==r&&Math.abs(dz)!==r)continue;const xx=clamp(Math.floor(x)+dx,2,45)+.5,zz=clamp(Math.floor(z)+dz,2,45)+.5,y=w.surface(Math.floor(xx),Math.floor(zz)),floor=w.get(Math.floor(xx),y-1,Math.floor(zz));if([1,2,13].includes(floor)&&!animalBlocked(w,a,xx,y,zz))return{x:xx,y,z:zz};}return null;}
export function createAnimals(w,saved){const result=[];if(Array.isArray(saved))for(const raw of saved.slice(0,10)){if(!raw||!['cow','sheep'].includes(raw.species)||!['x','y','z'].every(k=>Number.isFinite(raw[k]))||raw.x<1||raw.x>47||raw.z<1||raw.z>47||raw.y<1||raw.y>22)continue;const a={id:result.length,species:raw.species,x:raw.x,y:raw.y,z:raw.z,heading:Number.isFinite(raw.heading)?raw.heading:0,timer:1+result.length*.3,phase:0,vy:0,follow:0,moving:false,grazing:false};if(animalBlocked(w,a)){const spot=freeSpot(w,a,a.x,a.z);if(!spot)continue;Object.assign(a,spot);}result.push(a);}
  if(result.length)return result;
  const spots=[['cow',23,32],['sheep',26,31],['cow',20,30],['sheep',31,32],['sheep',18,39],['cow',34,37],['sheep',15,33]];
  for(const [species,x,z]of spots){const a={id:result.length,species,heading:result.length*.9+.4,timer:1+result.length*.4,phase:result.length,vy:0,follow:0,moving:false,grazing:false};const spot=freeSpot(w,a,x,z);if(spot)result.push({...a,...spot});}return result;
}
export function updateAnimals(w,dt){for(const a of w.animals){a.phase+=dt;a.timer-=dt;a.follow=Math.max(0,a.follow-dt);a.moving=false;a.grazing=false;
    if(animalBlocked(w,a)){const spot=freeSpot(w,a,a.x,a.z);if(spot)Object.assign(a,spot);a.vy=0;}
    const distance=Math.hypot(w.player.x-a.x,w.player.z-a.z);if(a.follow>0){a.heading=Math.atan2(w.player.x-a.x,w.player.z-a.z);a.moving=distance>1.7;}else{if(a.timer<=0){a.heading+=Math.sin(a.phase*1.7+a.id*13)*1.5;a.timer=2.8+(Math.sin(a.phase+a.id)+1)*1.7;}a.moving=a.timer>1.6&&!w.night();a.grazing=!a.moving;}
    if(a.moving){const speed=a.species==='cow'?.67:.8,dx=Math.sin(a.heading)*speed*dt,dz=Math.cos(a.heading)*speed*dt;let moved=false;
      for(const axis of ['x','z']){const nx=clamp(a.x+(axis==='x'?dx:0),1,47),nz=clamp(a.z+(axis==='z'?dz:0),1,47);if(!animalBlocked(w,a,nx,a.y,nz)){a.x=nx;a.z=nz;moved=true;}else if(!animalBlocked(w,a,nx,a.y+1,nz)&&solid(w,nx,a.y-.05,nz)&&solid(w,nx,a.y+.3,nz)){a.y+=1;a.x=nx;a.z=nz;moved=true;}}
      if(!moved){a.heading+=1.3;a.timer=2.5;}a.moving=moved;
    }
    if(solid(w,a.x,a.y-.06,a.z)&&a.vy<=0)a.vy=0;else{a.vy=Math.max(-12,a.vy-18*dt);const next=a.y+a.vy*dt;if(!animalBlocked(w,a,a.x,next,a.z))a.y=next;else{if(a.vy<0){let low=next,high=a.y;for(let n=0;n<8;n++){const mid=(low+high)/2;if(animalBlocked(w,a,a.x,mid,a.z))low=mid;else high=mid;}a.y=high;}a.vy=0;}}
  }}
export function feedAnimal(w,id){const a=w.animals.find(a=>a.id===id);if(!a||Math.hypot(a.x-w.player.x,a.y-w.player.y,a.z-w.player.z)>3.2){w.message='走近动物后，再按 E 喂食。';return false;}if(w.mode!=='creative'&&!(w.inv.berry>0)){w.message='需要一颗浆果。采集树叶可获得浆果。';return false;}if(w.mode!=='creative')w.inv.berry--;a.follow=25;a.timer=0;w.message=(a.species==='cow'?'奶牛':'绵羊')+'喜欢你带来的浆果，会跟随你一会儿。';return true;}
