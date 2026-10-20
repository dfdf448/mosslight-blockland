// 搜打撤的世界、战斗和结算逻辑独立于画面，便于复现与校验。
export const RAID_KEY='mosslight-raid-v3';
export const GRID=41,TILE=1.4,HALF=GRID*TILE/2;
export const ITEMS={
  scrap:{name:'废铁',value:6,weight:1,color:'#a7b7b1'},battery:{name:'能源电池',value:18,weight:1,color:'#72c9c1'},
  med:{name:'医疗包',value:25,weight:1,color:'#e99586'},core:{name:'遗迹晶核',value:90,weight:2,color:'#c7a0f4'},
  blueprint:{name:'古代蓝图',value:140,weight:1,color:'#e7c275'},parts:{name:'武器零件',value:14,weight:1,color:'#91b7d4'},
  wood:{name:'木材',value:3,weight:.5,color:'#b9915f'},stone:{name:'石料',value:4,weight:.7,color:'#a2aaa1'},
  key:{name:'钥匙卡',value:20,weight:.2,color:'#9ed3a7'},shotgun:{name:'霰弹枪',value:100,weight:3,color:'#8cbd8d'},rifle:{name:'脉冲步枪',value:150,weight:3,color:'#b29bdd'}
};
export const GUNS={pistol:{name:'回收手枪',clip:18,damage:23,interval:.24,reload:1.1,pellets:1,speed:38,life:.7,spread:.018},shotgun:{name:'霰弹枪',clip:6,damage:14,interval:.64,reload:1.6,pellets:5,speed:31,life:.43,spread:.16},rifle:{name:'脉冲步枪',clip:28,damage:12,interval:.105,reload:1.4,pellets:1,speed:43,life:.72,spread:.035}};
export const CONTRACTS={supplies:{name:'带出两枚电池',reward:65},hunter:{name:'击败五个敌人并撤离',reward:85},relic:{name:'带出遗迹晶核',reward:130}};
export const SPAWN={x:-21,z:21};
export const EXITS=[{id:'dock',name:'南岸码头',x:-23.8,z:23.8},{id:'lift',name:'北部缆车',x:-23.8,z:-23.8,key:true}];
export const CRATE_POS=[[-18.2,18.2],[-11.2,16.8],[-21,5.6],[-12.6,-5.6],[-21,-18.2],[0,12.6],[12.6,9.8],[21,0],[19.6,-16.8],[7,-19.6],[0,-5.6]];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,def,a,b)=>Number.isFinite(x)?clamp(x,a,b):def;
export function rng(seed){let state=seed>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
export const cell=(x,z)=>({i:Math.floor((x+HALF)/TILE),j:Math.floor((z+HALF)/TILE)});
export const center=(i,j)=>({x:(i+.5)*TILE-HALF,z:(j+.5)*TILE-HALF});
export function cleanBag(v){const out={};if(v&&typeof v==='object')for(const id of Object.keys(ITEMS)){const n=Math.floor(finite(v[id],0,0,999));if(n)out[id]=n;}return out;}
export function newProfile(){return{version:3,credits:90,stash:{},upgrades:{health:0,armor:0,bag:0},blueprints:{pistol:true,shotgun:false,rifle:false},stats:{runs:0,extracts:0,kills:0,best:0},settled:[],run:null,last:null};}
export function parseProfile(v){if(!v||v.version!==3)return newProfile();const p=newProfile();p.credits=Math.floor(finite(v.credits,90,0,999999));p.stash=cleanBag(v.stash);for(const key of ['health','armor','bag'])p.upgrades[key]=Math.floor(finite(v.upgrades?.[key],0,0,5));for(const key of ['shotgun','rifle'])p.blueprints[key]=v.blueprints?.[key]===true;for(const key of ['runs','extracts','kills','best'])p.stats[key]=Math.floor(finite(v.stats?.[key],0,0,999999));p.settled=Array.isArray(v.settled)?v.settled.filter(n=>typeof n==='string').slice(-20):[];p.last=v.last&&typeof v.last==='object'?v.last:null;p.run=validateRun(v.run);return p;}
function validateRun(v){
  if(!v||typeof v.id!=='string'||!Number.isInteger(v.seed)||!v.player||!['active'].includes(v.status))return null;
  const p=v.player;if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>27||Math.abs(p.z)>27||p.hp<=0)return null;
  return {...v,contract:CONTRACTS[v.contract]?v.contract:'supplies',deployed:GUNS[v.deployed]?v.deployed:'pistol',insured:v.insured===true,bossDead:v.bossDead===true,kills:Math.floor(finite(v.kills,0,0,999)),heat:finite(v.heat,0,0,100),bag:cleanBag(v.bag),time:finite(v.time,0,0,480),player:{...p,x:p.x,z:p.z,hp:finite(p.hp,100,1,150),armor:finite(p.armor,0,0,90),reserve:Math.floor(finite(p.reserve,72,0,500)),meds:Math.floor(finite(p.meds,1,0,6)),weapon:GUNS[p.weapon]?p.weapon:'pistol',mags:{pistol:18,...Object.fromEntries(Object.entries(p.mags||{}).filter(([k,n])=>GUNS[k]&&Number.isFinite(n)).map(([k,n])=>[k,clamp(Math.floor(n),0,GUNS[k].clip)]))}},crates:Array.isArray(v.crates)?v.crates.filter(Number.isInteger):[],changes:Array.isArray(v.changes)?v.changes.slice(0,200):[],enemies:Array.isArray(v.enemies)?v.enemies.slice(0,30).filter(e=>['melee','ranged','boss'].includes(e.type)&&Number.isFinite(e.x)&&Number.isFinite(e.z)&&Number.isFinite(e.hp)):[],drops:Array.isArray(v.drops)?v.drops.slice(0,48).filter(d=>ITEMS[d.item]&&Number.isFinite(d.x)&&Number.isFinite(d.z)):[]};
}
export function loadProfile(storage){try{return parseProfile(JSON.parse(storage.getItem(RAID_KEY)));}catch{return newProfile();}}
export function bagWeight(bag){return Object.entries(bag).reduce((s,[id,n])=>s+(ITEMS[id]?.weight||0)*n,0);}
export function bagValue(bag){return Object.entries(bag).reduce((s,[id,n])=>s+(ITEMS[id]?.value||0)*n,0);}
export function makeLevel(seed){
  const random=rng(seed),tiles=Array.from({length:GRID*GRID},()=>({kind:'floor',hp:0,shade:random()}));
  const tile=(i,j)=>tiles[j*GRID+i];
  for(let j=0;j<GRID;j++)for(let i=0;i<GRID;i++){const t=tile(i,j);if(i===0||j===0||i===GRID-1||j===GRID-1){t.kind='border';t.hp=999;}else if(i>=23&&i<=35&&j>=4&&j<=15&&(i===23||i===35||j===4||j===15)){t.kind='wall';t.hp=80;}else if(random()<.065){t.kind=random()<.6?'tree':'rock';t.hp=t.kind==='tree'?28:42;}}
  // 入口与贯穿全图的通道保持畅通，不让随机装饰封死路线。
  for(let k=1;k<GRID-1;k++){for(const w of [-1,0,1]){tile(20+w,k).kind='floor';tile(k,20+w).kind='floor';}}
  for(const p of [SPAWN,...EXITS,...CRATE_POS.map(([x,z])=>({x,z})),{x:11.2,z:-15.4}]){const q=cell(p.x,p.z);for(let j=q.j-2;j<=q.j+2;j++)for(let i=q.i-2;i<=q.i+2;i++)if(i>0&&j>0&&i<GRID-1&&j<GRID-1)tile(i,j).kind='floor';}
  for(let j=15;j<=23;j++)for(let i=28;i<=30;i++)tile(i,j).kind='floor';
  // 遗迹的围墙保留开口，内部奖品由守卫保护。
  tile(29,15).kind='floor';tile(30,15).kind='floor';
  return{tiles,revision:0,dirty:new Set(['all'])};
}
const blockedKind=k=>['tree','rock','wall','cover','border'].includes(k);
const segmentDistance=(px,pz,ax,az,bx,bz)=>{const dx=bx-ax,dz=bz-az,t=clamp(((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz||1),0,1);return (px-ax-dx*t)**2+(pz-az-dz*t)**2;};

export class RaidGame {
  constructor(profile,{event=()=>{},save=()=>{}}={}){this.profile=profile;this.event=event;this.saveHook=save;this.run=null;this.level=null;this.bullets=[];this.effects=[];this.flow=new Int16Array(GRID*GRID);this.flowTimer=0;this.visualTick=0;this.entityId=0;if(profile.run)this.resume();}
  emit(type,text,extra={}){this.event({type,text,...extra});}
  persist(){this.profile.run=this.run?this.snapshot():null;this.saveHook(this.profile);}
  maxHealth(){return 100+this.profile.upgrades.health*10;}
  maxArmor(){return 35+this.profile.upgrades.armor*8;}
  capacity(){return 22+this.profile.upgrades.bag*5;}
  tileAt(x,z){const p=cell(x,z);return p.i<0||p.j<0||p.i>=GRID||p.j>=GRID?{kind:'border',hp:999}:this.level.tiles[p.j*GRID+p.i];}
  blocked(x,z,r=.3){for(const dx of [-r,r])for(const dz of [-r,r])if(blockedKind(this.tileAt(x+dx,z+dz).kind))return true;return false;}
  lineClear(ax,az,bx,bz){const steps=Math.ceil(Math.hypot(bx-ax,bz-az)/.35);for(let k=1;k<=steps;k++)if(blockedKind(this.tileAt(ax+(bx-ax)*k/steps,az+(bz-az)*k/steps).kind))return false;return true;}
  start(weapon='pistol',contract='supplies'){
    if(this.run)return false;if(!GUNS[weapon])weapon='pistol';let insured=!!this.profile.blueprints[weapon];
    if(!insured){if(!(this.profile.stash[weapon]>0))weapon='pistol';else this.profile.stash[weapon]--;}
    insured=!!this.profile.blueprints[weapon];const seed=(Date.now()^Math.imul(this.profile.stats.runs+1,2654435761))>>>0;
    this.run={id:seed.toString(36)+'-'+this.profile.stats.runs,status:'active',seed,time:0,bag:{},crates:[],changes:[],enemies:[],drops:[],kills:0,heat:0,contract:CONTRACTS[contract]?contract:'supplies',insured,deployed:weapon,keyUsed:false,extraction:null,bossDead:false,waveAt:50,player:{x:SPAWN.x,z:SPAWN.z,prevX:SPAWN.x,prevZ:SPAWN.z,hp:this.maxHealth(),armor:this.maxArmor(),reserve:90,meds:1,weapon,mags:{pistol:18,[weapon]:GUNS[weapon].clip},angle:0,reload:0,fire:0,roll:0,rollCd:0,pulseCd:0,invulnerable:1.2,heal:0}};
    this.level=makeLevel(seed);this.profile.stats.runs++;this.bullets=[];this.effects=[];this.flowTimer=0;this.entityId=0;
    const enemies=[[-11.2,16.8,'melee'],[-8.4,12.6,'ranged'],[-16.8,1.4,'melee'],[-22.4,-9.8,'ranged'],[-9.8,-12.6,'melee'],[4.2,7,'ranged'],[16.8,8.4,'melee'],[21,-5.6,'ranged'],[7,-8.4,'melee'],[19.6,-19.6,'ranged'],[11.2,-15.4,'boss']];
    for(const [x,z,type]of enemies)this.spawn(type,x,z);
    this.persist();this.emit('start','进入回收区。先搜索西北侧的补给箱，注意巡逻守卫。');return true;
  }
  resume(){this.run=validateRun(this.profile.run);if(!this.run)return;this.level=makeLevel(this.run.seed);for(const change of this.run.changes){if(Number.isInteger(change.index)&&change.index>=0&&change.index<GRID*GRID&&['floor','cover'].includes(change.kind))this.level.tiles[change.index]={kind:change.kind,hp:change.kind==='cover'?65:0,shade:.5};}
    const p=this.run.player;Object.assign(p,{prevX:p.x,prevZ:p.z,reload:0,fire:0,roll:0,rollCd:0,pulseCd:0,invulnerable:1.5,heal:0});if(this.blocked(p.x,p.z)){p.x=SPAWN.x;p.z=SPAWN.z;p.prevX=p.x;p.prevZ=p.z;}this.run.extraction=null;this.run.waveAt=Number.isFinite(this.run.waveAt)?this.run.waveAt:this.run.time+50;this.run.kills=this.run.kills||0;this.run.heat=this.run.heat||0;this.entityId=Math.max(0,...this.run.enemies.map(e=>e.id||0),...this.run.drops.map(e=>e.id||0));this.bullets=[];this.effects=[];this.flowTimer=0;
  }
  snapshot(){const r=this.run;if(!r)return null;return JSON.parse(JSON.stringify({...r,enemies:r.enemies.filter(e=>e.hp>0),player:{...r.player,roll:0,invulnerable:0},extraction:null}));}
  spawn(type,x,z){if(!this.run||this.run.enemies.filter(e=>e.hp>0).length>=26)return;let p={x,z};if(this.blocked(x,z,.35)){let found=false;for(let radius=1;radius<5&&!found;radius++)for(let i=-radius;i<=radius&&!found;i++)for(let j=-radius;j<=radius;j++){const q={x:x+i*TILE,z:z+j*TILE};if(!this.blocked(q.x,q.z,.35)){p=q;found=true;break;}}if(!found)return;}
    const hp=type==='boss'?320:type==='ranged'?48:55;this.run.enemies.push({id:++this.entityId,type,x:p.x,z:p.z,prevX:p.x,prevZ:p.z,hp,maxHp:hp,cooldown:1.3,stun:0,angle:0,telegraph:0,charge:0});}
  addItem(id,count=1){if(!ITEMS[id]||!this.run)return false;const r=this.run;if(bagWeight(r.bag)+ITEMS[id].weight*count>this.capacity()+.01){this.emit('notice','背包超重。打开背包丢弃低价值物品，或先撤离。');return false;}r.bag[id]=(r.bag[id]||0)+count;this.emit('loot',ITEMS[id].name+' +'+count,{item:id});return true;}
  dropItem(id){const r=this.run;if(!r||!r.bag[id])return;const p=r.player;r.bag[id]--;if(!r.bag[id])delete r.bag[id];this.drop(id,1,p.x+.7,p.z+.3);if(p.weapon===id&&!r.bag[id]&&r.deployed!==id)p.weapon='pistol';this.persist();}
  drop(item,count,x,z){if(this.run.drops.length>=48)this.run.drops.shift();this.run.drops.push({id:++this.entityId,item,count,x,z});}
  weapons(){if(!this.run)return['pistol'];return['pistol','shotgun','rifle'].filter(id=>id==='pistol'||id===this.run.deployed||this.run.bag[id]>0);}
  equip(id){const r=this.run;if(!r||!this.weapons().includes(id))return false;r.player.weapon=id;r.player.reload=0;r.player.mags[id]??=GUNS[id].clip;this.emit('equip',GUNS[id].name);return true;}
  reload(){const p=this.run?.player;if(!p||p.reload>0||p.reserve<=0||p.mags[p.weapon]>=GUNS[p.weapon].clip)return;p.reload=GUNS[p.weapon].reload;this.emit('reload','换弹中');}
  heal(){const p=this.run?.player;if(!p||p.heal>0||p.hp>=this.maxHealth())return;if(p.meds<=0){if((this.run.bag.med||0)>0)this.run.bag.med--;else{this.emit('notice','没有医疗包。');return;}}else p.meds--;p.heal=1.25;this.emit('notice','使用医疗包，受击会打断。');}
  roll(dx,dz){const p=this.run?.player;if(!p||p.rollCd>0)return;const length=Math.hypot(dx,dz)||1;p.rollX=dx/length;p.rollZ=dz/length;if(!dx&&!dz){p.rollX=Math.sin(p.angle);p.rollZ=Math.cos(p.angle);}p.roll=.23;p.rollCd=1.15;p.invulnerable=.3;p.heal=0;this.emit('roll','翻滚');}
  pulse(){const p=this.run?.player;if(!p||p.pulseCd>0)return;p.pulseCd=8;this.fx('pulse',p.x,p.z,'#8fded7',1);for(const e of this.run.enemies)if(e.hp>0&&Math.hypot(p.x-e.x,p.z-e.z)<5.4){this.hitEnemy(e,26);e.stun=1;}this.run.heat=clamp(this.run.heat+4,0,100);this.emit('pulse','共鸣脉冲');}
  build(aimX,aimZ){const r=this.run;if(!r)return;const p=r.player,dx=aimX-p.x,dz=aimZ-p.z,length=Math.hypot(dx,dz)||1,spot=cell(p.x+dx/length*1.8,p.z+dz/length*1.8);if(spot.i<1||spot.j<1||spot.i>=GRID-1||spot.j>=GRID-1)return;const pos=center(spot.i,spot.j),t=this.tileAt(pos.x,pos.z);
    if(t.kind!=='floor'||Math.hypot(pos.x-p.x,pos.z-p.z)<.9||this.run.enemies.some(e=>e.hp>0&&Math.hypot(e.x-pos.x,e.z-pos.z)<1)||CRATE_POS.some(([x,z])=>Math.hypot(x-pos.x,z-pos.z)<1.2)||EXITS.some(e=>Math.hypot(e.x-pos.x,e.z-pos.z)<3)){this.emit('notice','这里不能搭建掩体，换一个空地。');return;}
    if((r.bag.wood||0)>=3)r.bag.wood-=3;else if((r.bag.stone||0)>=2)r.bag.stone-=2;else{this.emit('notice','掩体需要 3 木材或 2 石料。靠近树木或矿石按住 E 采集。');return;}
    this.changeTile(spot.i,spot.j,'cover');this.emit('build','掩体已搭建，可以挡住弹丸，也会被敌人击碎。');this.persist();
  }
  changeTile(i,j,kind){const index=j*GRID+i,t=this.level.tiles[index];t.kind=kind;t.hp=kind==='cover'?65:0;const existing=this.run.changes.find(c=>c.index===index);if(existing)existing.kind=kind;else this.run.changes.push({index,kind});this.level.revision++;this.level.dirty.add(Math.floor(i/8)+','+Math.floor(j/8));this.flowTimer=0;}
  nearby(aimX,aimZ){const r=this.run;if(!r)return null;const p=r.player;let result=null,best=2.55;
    r.drops.forEach(d=>{const distance=Math.hypot(d.x-p.x,d.z-p.z);if(distance<best){best=distance;result={kind:'drop',id:d.id,x:d.x,z:d.z,label:'拾取 '+ITEMS[d.item].name+' ×'+d.count};}});
    CRATE_POS.forEach(([x,z],id)=>{if(r.crates.includes(id))return;const distance=Math.hypot(x-p.x,z-p.z);if(distance<best){best=distance;result={kind:'crate',id,x,z,label:'搜索补给箱',duration:1.05};}});
    for(const exit of EXITS){const distance=Math.hypot(exit.x-p.x,exit.z-p.z);if(distance<2.25){best=distance;result={kind:'exit',...exit,label:exit.key&&!r.keyUsed?'开启缆车 · 需要钥匙卡':'呼叫撤离 · 守住 6 秒'};}}
    if(!result&&Number.isFinite(aimX)&&Math.hypot(aimX-p.x,aimZ-p.z)<3){const q=cell(aimX,aimZ),t=this.tileAt(aimX,aimZ);if(['tree','rock','wall','cover'].includes(t.kind)){const pos=center(q.i,q.j);result={kind:'mine',i:q.i,j:q.j,...pos,label:t.kind==='tree'?'采集木材':t.kind==='rock'?'采集石料':t.kind==='cover'?'拆除掩体':'破拆遗迹墙体',duration:t.kind==='wall'?2.3:.65};}}
    return result;
  }
  interact(target){if(!target||!this.run)return false;const r=this.run,p=r.player;
    if(target.kind==='drop'){const index=r.drops.findIndex(d=>d.id===target.id);if(index>=0){const d=r.drops[index];if(this.addItem(d.item,d.count)){r.drops.splice(index,1);if(GUNS[d.item]){p.mags[d.item]??=GUNS[d.item].clip;this.emit('notice','拾得武器，可按 1/2/3 或背包装备。');}this.persist();}}return true;}
    if(target.kind==='exit'){
      const unlock=this.profile.stats.runs===1?20:40;if(r.time<unlock){this.emit('notice','撤离通道还需 '+Math.ceil(unlock-r.time)+' 秒开放，先搜索附近物资。');return false;}
      if(target.key&&!r.keyUsed){if(!(r.bag.key>0)){this.emit('notice','缆车需要钥匙卡，西北缓存箱可能藏着它。');return false;}r.bag.key--;r.keyUsed=true;}
      if(!r.extraction){r.extraction={id:target.id,progress:0,blocked:false};r.heat=clamp(r.heat+18,0,100);this.spawn('ranged',p.x+9,p.z-8);this.spawn('melee',p.x+8,p.z-6);this.emit('extract','撤离信标已亮。留在光圈内，清理近处敌人。');}return true;
    }
    if(target.kind==='crate'&&!r.crates.includes(target.id)){
      if(target.id===9&&!r.bossDead){this.emit('notice','遗迹保险箱仍被守卫锁定，先击败遗迹守卫。');return false;}
      r.crates.push(target.id);const random=rng(r.seed+target.id*971);
      const loot=target.id===0?[['scrap',3],['battery',1],['wood',3]]:target.id===4?[['key',1],['battery',1],['parts',2]]:target.id===9?[['blueprint',1],['core',1],['rifle',1]]:[['scrap',2+Math.floor(random()*3)],[random()<.45?'battery':'parts',1+Math.floor(random()*2)],[random()<.18?'shotgun':random()<.2?'med':'stone',1]];
      for(const [id,count]of loot)if(!this.addItem(id,count))this.drop(id,count,target.x+.4,target.z+.4);p.reserve=Math.min(400,p.reserve+24);r.heat=clamp(r.heat+6,0,100);this.fx('loot',target.x,target.z,'#f0ce82',1);this.emit('search','补给箱已搜索 · 弹药 +24');this.persist();return true;
    }
    if(target.kind==='mine'){const t=this.tileAt(target.x,target.z);if(!['tree','rock','wall','cover'].includes(t.kind))return false;const id=t.kind==='tree'?'wood':t.kind==='rock'?'stone':t.kind==='wall'?'scrap':'wood',count=t.kind==='tree'?3:2;this.changeTile(target.i,target.j,'floor');if(!this.addItem(id,count))this.drop(id,count,target.x,target.z);r.heat=clamp(r.heat+(id==='scrap'?9:2),0,100);this.fx('break',target.x,target.z,ITEMS[id].color,1);this.persist();return true;}return false;
  }
  shoot(aimX,aimZ){const r=this.run,p=r.player,g=GUNS[p.weapon];if(p.fire>0||p.reload>0||p.heal>0||p.roll>0)return;if(p.mags[p.weapon]<=0){this.reload();return;}p.mags[p.weapon]--;p.fire=g.interval;r.heat=clamp(r.heat+.45,0,100);const angle=Math.atan2(aimX-p.x,aimZ-p.z);p.angle=angle;
    for(let k=0;k<g.pellets;k++){const spread=(g.pellets===1?Math.sin(r.time*91)*g.spread:(k-(g.pellets-1)/2)*g.spread),a=angle+spread;this.bullet(p.x+Math.sin(a)*.6,p.z+Math.cos(a)*.6,Math.sin(a)*g.speed,Math.cos(a)*g.speed,'player',g.damage,g.life);}
    this.fx('muzzle',p.x+Math.sin(angle)*.7,p.z+Math.cos(angle)*.7,'#ffdf88',.3);this.emit('shot','',{weapon:p.weapon});
  }
  strike(aimX,aimZ){const p=this.run.player;if(p.fire>0||p.reload>0||p.heal>0)return;p.fire=.43;let hit=false;for(const e of this.run.enemies)if(e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<1.95&&this.lineClear(p.x,p.z,e.x,e.z)){this.hitEnemy(e,23);e.stun=.17;hit=true;}if(!hit){const target=this.nearby(aimX,aimZ);if(target?.kind==='mine'){const t=this.tileAt(target.x,target.z);t.hp-=20;this.fx('hit',target.x,target.z,'#d8c59b',.6);if(t.hp<=0)this.interact(target);}}this.emit('swing','挥镐');}
  bullet(x,z,vx,vz,owner,damage,life=1.7){if(this.bullets.length>=160)return;this.bullets.push({x,z,prevX:x,prevZ:z,vx,vz,owner,damage,life});}
  fx(type,x,z,color,size=1){if(this.effects.length>=64)this.effects.shift();this.effects.push({type,x,z,color,size,life:type==='pulse'?.45:.22,total:type==='pulse'?.45:.22});}
  hitEnemy(e,damage){if(e.hp<=0)return;e.hp-=damage;this.fx('hit',e.x,e.z,'#f6d09e',.6);this.emit('hit','',{x:e.x,z:e.z,damage});if(e.hp>0)return;this.run.kills++;this.profile.stats.kills++;this.drop(e.type==='boss'?'core':'scrap',e.type==='boss'?1:2,e.x,e.z);this.run.player.reserve=Math.min(400,this.run.player.reserve+(e.type==='boss'?24:6));if(e.type==='boss'){this.run.bossDead=true;this.drop('rifle',1,e.x+.9,e.z);this.emit('boss','遗迹守卫已解除。内部保险箱现在可以搜索。');}else this.emit('kill','击败巡逻守卫 · 弹药 +6');}
  damagePlayer(damage,source='enemy'){const r=this.run;if(!r)return;const p=r.player;if(p.invulnerable>0)return;const absorbed=Math.min(p.armor,damage*.7);p.armor-=absorbed;p.hp-=damage-absorbed;p.invulnerable=.22;p.heal=0;if(r.extraction&&source==='enemy')r.extraction.progress=0;this.fx('hurt',p.x,p.z,'#f0a393',1);this.emit('hurt','受到攻击',{damage});if(p.hp<=0)this.settle(false,source==='storm'?'未能避开边缘腐蚀':'被巡逻守卫击倒');}
  updateFlow(){const p=this.run.player,start=cell(p.x,p.z),queue=new Int16Array(GRID*GRID);this.flow.fill(-1);let head=0,tail=0;const startId=start.j*GRID+start.i;if(startId<0||startId>=this.flow.length)return;queue[tail++]=startId;this.flow[startId]=0;
    while(head<tail){const id=queue[head++],i=id%GRID,j=Math.floor(id/GRID);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=i+dx,nj=j+dz,n=nj*GRID+ni;if(ni<1||nj<1||ni>=GRID-1||nj>=GRID-1||this.flow[n]>=0||blockedKind(this.level.tiles[n].kind))continue;this.flow[n]=this.flow[id]+1;queue[tail++]=n;}}
  }
  step(dt,input){const r=this.run;if(!r)return;const p=r.player;r.time+=dt;
    p.prevX=p.x;p.prevZ=p.z;p.invulnerable=Math.max(0,p.invulnerable-dt);p.fire=Math.max(0,p.fire-dt);p.rollCd=Math.max(0,p.rollCd-dt);p.pulseCd=Math.max(0,p.pulseCd-dt);
    if(p.reload>0){p.reload=Math.max(0,p.reload-dt);if(p.reload===0){const needed=Math.min(GUNS[p.weapon].clip-p.mags[p.weapon],p.reserve);p.mags[p.weapon]+=needed;p.reserve-=needed;}}
    if(p.heal>0){p.heal=Math.max(0,p.heal-dt);if(p.heal===0){p.hp=Math.min(this.maxHealth(),p.hp+48);this.emit('heal','生命恢复');}}
    const length=Math.hypot(input.dx,input.dz),speed=input.sprint?6.2:4.8,weight=bagWeight(r.bag)/this.capacity();let dx=(input.dx||0)/(length||1)*speed*(weight>.85?.84:1)*dt,dz=(input.dz||0)/(length||1)*speed*(weight>.85?.84:1)*dt;
    if(p.roll>0){p.roll=Math.max(0,p.roll-dt);dx=p.rollX*13*dt;dz=p.rollZ*13*dt;}
    if(!this.blocked(p.x+dx,p.z))p.x+=dx;if(!this.blocked(p.x,p.z+dz))p.z+=dz;
    if(Number.isFinite(input.aimX))p.angle=Math.atan2(input.aimX-p.x,input.aimZ-p.z);
    if(input.fire){if(p.tool)this.strike(input.aimX??p.x,input.aimZ??p.z-10);else this.shoot(input.aimX??p.x,input.aimZ??p.z-10);}
    if(input.interact){const target=this.nearby(input.aimX,input.aimZ);if(target){const key=target.kind+':'+(target.id??target.i+','+target.j);if(this.searchKey!==key){this.searchKey=key;this.searchProgress=0;}this.searchProgress=(this.searchProgress||0)+dt;if(this.searchProgress>=(target.duration||.05)){this.interact(target);this.searchProgress=0;}}else this.searchProgress=0;}else{this.searchProgress=0;this.searchKey=null;}
    this.flowTimer-=dt;if(this.flowTimer<=0){this.flowTimer=.3;this.updateFlow();}
    for(const e of r.enemies){if(e.hp<=0)continue;e.prevX=e.x;e.prevZ=e.z;e.cooldown=Math.max(0,(e.cooldown||0)-dt);e.stun=Math.max(0,(e.stun||0)-dt);if(e.stun>0)continue;const distance=Math.hypot(p.x-e.x,p.z-e.z);if(distance>16&&e.type!=='boss')continue;if(e.type==='boss'&&distance>13)continue;e.angle=Math.atan2(p.x-e.x,p.z-e.z);
      const clear=this.lineClear(e.x,e.z,p.x,p.z);let mx=0,mz=0;if((e.type==='melee'&&distance>1)||(e.type==='boss'&&distance>5)||(e.type==='ranged'&&(!clear||distance>8))){if(clear){mx=(p.x-e.x)/(distance||1);mz=(p.z-e.z)/(distance||1);}else{const q=cell(e.x,e.z);let best=32767,spot=null;for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=q.i+di,nj=q.j+dj;if(ni<1||nj<1||ni>=GRID-1||nj>=GRID-1)continue;const f=this.flow[nj*GRID+ni];if(f>=0&&f<best){best=f;spot=center(ni,nj);}}if(spot){const d=Math.hypot(spot.x-e.x,spot.z-e.z)||1;mx=(spot.x-e.x)/d;mz=(spot.z-e.z)/d;}}}
      const es=e.type==='boss'?1.6:e.type==='ranged'?1.8:2.5;if(!this.blocked(e.x+mx*es*dt,e.z,.38))e.x+=mx*es*dt;if(!this.blocked(e.x,e.z+mz*es*dt,.38))e.z+=mz*es*dt;
      if(e.type==='melee'&&distance<1.1&&e.cooldown===0){this.damagePlayer(14);e.cooldown=.9;if(!this.run)return;}
      if(e.type!=='melee'&&clear&&distance<12&&e.cooldown===0){e.telegraph=.45;e.cooldown=e.type==='boss'?1.7:1.9;}
      if(e.telegraph>0){e.telegraph-=dt;if(e.telegraph<=0){const spread=e.type==='boss'?[-.18,0,.18]:[0];for(const add of spread){const angle=e.angle+add;this.bullet(e.x+Math.sin(angle)*.6,e.z+Math.cos(angle)*.6,Math.sin(angle)*10,Math.cos(angle)*10,'enemy',e.type==='boss'?17:11,1.5);}}}
    }
    for(let i=this.bullets.length-1;i>=0;i--){const b=this.bullets[i];b.prevX=b.x;b.prevZ=b.z;const nx=b.x+b.vx*dt,nz=b.z+b.vz*dt;b.life-=dt;
      if(!this.lineClear(b.x,b.z,nx,nz)){const t=this.tileAt(nx,nz);if(t.kind==='cover'){t.hp-=b.damage;if(t.hp<=0){const c=cell(nx,nz);this.changeTile(c.i,c.j,'floor');}}b.life=0;}
      else if(b.owner==='player'){for(const e of r.enemies)if(e.hp>0&&segmentDistance(e.x,e.z,b.x,b.z,nx,nz)<(e.type==='boss'?.8:.45)**2){this.hitEnemy(e,b.damage);b.life=0;break;}}
      else if(segmentDistance(p.x,p.z,b.x,b.z,nx,nz)<.33**2){this.damagePlayer(b.damage);if(!this.run)return;b.life=0;}
      b.x=nx;b.z=nz;if(b.life<=0)this.bullets.splice(i,1);
    }
    for(let i=this.effects.length-1;i>=0;i--){this.effects[i].life-=dt;if(this.effects[i].life<=0)this.effects.splice(i,1);}
    if(r.extraction){const exit=EXITS.find(e=>e.id===r.extraction.id),distance=Math.hypot(p.x-exit.x,p.z-exit.z);r.extraction.blocked=r.enemies.some(e=>e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<5.5);if(distance>2.25)r.extraction.progress=0;else if(!r.extraction.blocked)r.extraction.progress+=dt;if(r.extraction.progress>=6){this.settle(true,'成功撤离');return;}}
    r.heat=Math.max(0,r.heat-dt*.12);if(r.time>=r.waveAt&&r.enemies.filter(e=>e.hp>0).length<22){r.waveAt=r.time+45;const angle=r.time*.3,dist=12;this.spawn(r.heat>40?'ranged':'melee',clamp(p.x+Math.cos(angle)*dist,-24,24),clamp(p.z+Math.sin(angle)*dist,-24,24));if(r.heat>65)this.spawn('ranged',clamp(p.x-Math.cos(angle)*dist,-24,24),clamp(p.z-Math.sin(angle)*dist,-24,24));}
    if(r.time>360&&!r.stormNotice){r.stormNotice=true;this.emit('notice','边缘开始腐蚀。沿安全区域移动，并尽快前往撤离点。');}if(r.time>360&&Math.hypot(p.x,p.z)>26-(r.time-360)*.07){this.stormTick=(this.stormTick||0)+dt;if(this.stormTick>1){this.stormTick=0;this.damagePlayer(4,'storm');if(!this.run)return;}}
    if(r.time>=480){this.settle(false,'回收窗口结束，未能及时撤离');return;}
  }
  settle(success,reason){const r=this.run;if(!r||this.profile.settled.includes(r.id))return;const value=bagValue(r.bag),contract=r.contract,complete=success&&(contract==='supplies'?(r.bag.battery||0)>=2:contract==='hunter'?r.kills>=5:(r.bag.core||0)>=1),reward=success?25+(complete?CONTRACTS[contract].reward:0):0;
    if(success){for(const [id,n]of Object.entries(r.bag))this.profile.stash[id]=(this.profile.stash[id]||0)+n;if(!r.insured)this.profile.stash[r.deployed]=(this.profile.stash[r.deployed]||0)+1;this.profile.credits+=reward;this.profile.stats.extracts++;this.profile.stats.best=Math.max(this.profile.stats.best,value);}
    this.profile.last={success,reason,time:r.time,kills:r.kills,bag:{...r.bag},value,reward,contractComplete:complete,id:r.id};this.profile.settled.push(r.id);this.profile.settled=this.profile.settled.slice(-20);this.run=null;this.profile.run=null;this.bullets=[];this.effects=[];this.persist();this.emit('settled',reason,{success,summary:this.profile.last});
  }
  sell(id){if(!ITEMS[id]||!(this.profile.stash[id]>0))return false;this.profile.stash[id]--;this.profile.credits+=ITEMS[id].value;this.persist();return true;}
  upgrade(id){if(!['health','armor','bag'].includes(id))return false;const level=this.profile.upgrades[id],cost=70+level*55;if(level>=5||this.profile.credits<cost){this.emit('notice',level>=5?'已达到升级上限。':'信用点不足，需要 '+cost+'。');return false;}this.profile.credits-=cost;this.profile.upgrades[id]++;this.persist();return true;}
  craft(id){if(!['shotgun','rifle'].includes(id)||this.profile.blueprints[id])return false;const recipe=id==='shotgun'?{scrap:6,parts:3}:{scrap:10,battery:3,parts:5},cost=id==='shotgun'?75:135;if(this.profile.credits<cost||Object.entries(recipe).some(([k,n])=>(this.profile.stash[k]||0)<n)){this.emit('notice','材料或信用点不足。可通过搜索、撤离和出售战利品获得。');return false;}for(const [k,n]of Object.entries(recipe))this.profile.stash[k]-=n;this.profile.credits-=cost;this.profile.blueprints[id]=true;this.persist();this.emit('notice','图纸解锁：'+GUNS[id].name+'，此后可保险携行。');return true;}
}
