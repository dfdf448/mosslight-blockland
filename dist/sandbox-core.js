// 沙盒世界使用独立存档，挑战模式的仓库和行动不会受到影响。
import {createAnimals,updateAnimals} from './sandbox-animals.js';
export const SIZE=48,HEIGHT=24,SAVE_PREFIX='mosslight-sandbox-v1-';
export const BLOCKS={
  1:{name:'草方块',color:'#88ab60',time:.4},2:{name:'泥土',color:'#96734f',time:.4},
  3:{name:'石头',color:'#929da0',time:1.5,pick:true},4:{name:'原木',color:'#927046',time:1.1},
  5:{name:'树叶',color:'#64935d',time:.25},6:{name:'木板',color:'#c29a61',time:.6},
  7:{name:'玻璃',color:'#9ad9dc',time:.4},8:{name:'石砖',color:'#9aa9ad',time:1,pick:true},
  9:{name:'灯方块',color:'#f7db89',time:.4},10:{name:'工作台',color:'#b7874b',time:.7},
  11:{name:'床',color:'#ce796b',time:.4},12:{name:'篝火',color:'#eaa45e',time:.4},
  13:{name:'沙子',color:'#d9c492',time:.3},14:{name:'树苗',color:'#a0c66a',time:.15},
  15:{name:'基岩',color:'#47575c',time:Infinity}
};
export const RECIPES=[
  {id:'plank',name:'锯制木板 ×4',cost:{4:1},result:{6:4}},
  {id:'table',name:'工作台',cost:{6:4},result:{10:1}},
  {id:'pick',name:'木镐 · 开采石头',cost:{6:3,4:1},upgrade:'pick'},
  {id:'axe',name:'石斧 · 更快采集与近战',cost:{3:3,4:2},upgrade:'axe',table:true},
  {id:'glass',name:'熔制玻璃 ×4',cost:{13:4,4:1},result:{7:4},table:true},
  {id:'brick',name:'石砖 ×4',cost:{3:4},result:{8:4},table:true},
  {id:'lamp',name:'灯方块 ×2',cost:{4:1,3:2},result:{9:2},table:true},
  {id:'bed',name:'床 · 跳过夜晚与设置重生点',cost:{6:4,5:3},result:{11:1},table:true},
  {id:'fire',name:'篝火 · 附近休息回复生命',cost:{4:3,3:3},result:{12:1}},
  {id:'sapling',name:'树苗 ×2 · 可重新种树',cost:{5:3},result:{14:2}}
];
export const HOTBAR=[2,4,6,3,7,8,9,10,11];
export const index=(x,y,z)=>x+SIZE*(z+SIZE*y);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function random(seed){let state=seed>>>0;return()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);}
export function traceVoxel(world,origin,direction,reach=10){
  let x=Math.floor(origin.x),y=Math.floor(origin.y),z=Math.floor(origin.z),distance=0,normal={x:0,y:0,z:0};
  const axes=['x','y','z'],step={},delta={},next={};
  for(const a of axes){const d=direction[a];step[a]=d>=0?1:-1;delta[a]=d?Math.abs(1/d):Infinity;next[a]=d?((step[a]>0?Math.floor(origin[a])+1:Math.floor(origin[a]))-origin[a])/d:Infinity;}
  for(let i=0;i<160&&distance<=reach;i++){
    if(x>=0&&x<SIZE&&z>=0&&z<SIZE&&y>=0&&y<HEIGHT&&world.get(x,y,z))return{x,y,z,id:world.get(x,y,z),normal,distance};
    const a=next.x<next.y?(next.x<next.z?'x':'z'):(next.y<next.z?'y':'z');distance=next[a];if(!Number.isFinite(distance))break;next[a]+=delta[a];normal={x:0,y:0,z:0};normal[a]=-step[a];if(a==='x')x+=step[a];else if(a==='y')y+=step[a];else z+=step[a];
  }return null;
}
export class Sandbox {
  constructor(mode='creative',saved=null){
    this.mode=mode==='survival'?'survival':'creative';this.seed=Number.isInteger(saved?.seed)?saved.seed:61829;this.generation=saved?.version===1?(saved.generation===2?2:1):2;
    this.data=new Uint8Array(SIZE*SIZE*HEIGHT);this.edits=new Map();this.dirty=new Set();this.inv={};this.tools={pick:false,axe:false};this.stats={broken:0,placed:0,wood:0,crafted:0};this.day=85;this.foodClock=0;this.growthClock=0;this.mobs=[];this.mobClock=0;this.message='';this.generate();
    this.player={x:24.5,y:this.surface(24,38),z:38.5,hp:100,food:100};this.spawn={...this.player};
    if(saved?.version===1&&saved.mode===this.mode){
      if(Array.isArray(saved.edits))for(const entry of saved.edits.slice(0,this.data.length)){if(!Array.isArray(entry))continue;const [i,id]=entry;if(Number.isInteger(i)&&i>=SIZE*SIZE&&i<this.data.length&&Number.isInteger(id)&&(id===0||BLOCKS[id]&&id!==15)){this.data[i]=id;this.edits.set(i,id);}}
      for(const [id,n]of Object.entries(saved.inv||{}))if((BLOCKS[id]||id==='berry')&&Number.isFinite(n))this.inv[id]=Math.floor(clamp(n,0,9999));
      this.tools={pick:saved.tools?.pick===true,axe:saved.tools?.axe===true};
      for(const id of Object.keys(this.stats))if(Number.isFinite(saved.stats?.[id]))this.stats[id]=Math.floor(clamp(saved.stats[id],0,999999));
      this.day=Number.isFinite(saved.day)?clamp(saved.day,0,1e7):85;
      const p=saved.player;if(p&&['x','y','z','hp','food'].every(k=>Number.isFinite(p[k]))){this.player={x:clamp(p.x,1,SIZE-1),y:clamp(p.y,1,HEIGHT-2),z:clamp(p.z,1,SIZE-1),hp:clamp(p.hp,1,100),food:clamp(p.food,0,100)};if(this.collides(this.player.x,this.player.y,this.player.z))this.player.y=this.surface(Math.floor(p.x),Math.floor(p.z));}
      const sp=saved.spawn;if(sp&&['x','y','z'].every(k=>Number.isFinite(sp[k])))this.spawn={x:clamp(sp.x,1,SIZE-1),y:clamp(sp.y,1,HEIGHT-2),z:clamp(sp.z,1,SIZE-1)};
    }
    this.animals=createAnimals(this,saved?.animals);this.markAll();
  }
  generate(){const rand=random(this.seed);for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++){
    const natural=Math.round(3+Math.sin(x*.16)*1.3+Math.cos(z*.19)*1.1+Math.sin((x+z)*.14)*.8),h=this.generation>=2&&x>=19&&x<=31&&z>=32&&z<=43?3:natural,sand=x<5||z>43;
    for(let y=0;y<=h;y++)this.data[index(x,y,z)]=y===0?15:y<h-1?3:y===h?(sand?13:1):2;
  }
    const manual=this.generation>=2?[[30,37],[19,35]]:[[27,37],[21,35]],planted=[];for(let z=5;z<43;z++)for(let x=5;x<43;x++)if(rand()<.06&&Math.hypot(x-24,z-38)>(this.generation>=2?8:6)&&manual.every(([a,b])=>Math.hypot(x-a,z-b)>5)&&planted.every(t=>Math.hypot(t.x-x,t.z-z)>4.5)){const y=this.surface(x,z);this.tree(x,y,z,false);planted.push({x,z});}
    // 出生区附近保留可见且可触及的树木，保证生存开局能采到木材。
    for(const [x,z]of manual)this.tree(x,this.surface(x,z),z,false);
  }
  get(x,y,z){if(x<0||z<0||x>=SIZE||z>=SIZE||y<0)return 15;if(y>=HEIGHT)return 0;return this.data[index(x,y,z)];}
  surface(x,z){for(let y=HEIGHT-1;y>=0;y--)if(this.get(x,y,z))return y+1;return 1;}
  set(x,y,z,id,record=true){if(x<0||z<0||x>=SIZE||z>=SIZE||y<1||y>=HEIGHT-1)return false;const i=index(x,y,z);if(this.data[i]===id)return false;this.data[i]=id;if(record)this.edits.set(i,id);const cx=Math.floor(x/8),cz=Math.floor(z/8);for(const [a,b]of [[cx,cz],[Math.floor((x-1)/8),cz],[Math.floor((x+1)/8),cz],[cx,Math.floor((z-1)/8)],[cx,Math.floor((z+1)/8)]])if(a>=0&&b>=0&&a<6&&b<6)this.dirty.add(a+','+b);return true;}
  markAll(){for(let z=0;z<6;z++)for(let x=0;x<6;x++)this.dirty.add(x+','+z);}
  tree(x,y,z,record=true){if(y+5>=HEIGHT)return;for(let dy=0;dy<4;dy++)this.set(x,y+dy,z,4,record);for(let dy=2;dy<=4;dy++)for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)if(Math.abs(dx)+Math.abs(dz)<=(dy===4?1:3)&&!this.get(x+dx,y+dy,z+dz))this.set(x+dx,y+dy,z+dz,5,record);}
  collides(x,y,z){const r=.28;for(const a of [x-r,x+r])for(const b of [y+.03,y+.85,y+1.66])for(const c of [z-r,z+r])if(this.get(Math.floor(a),Math.floor(b),Math.floor(c)))return true;return false;}
  mineTime(id){if(!BLOCKS[id]||id===15)return Infinity;if(this.mode==='creative')return .12;if(BLOCKS[id].pick&&!this.tools.pick){this.message='石材需要木镐：先砍树 → 木板 → 制作木镐。';return Infinity;}return BLOCKS[id].time/(this.tools.axe?2.5:1);}
  breakBlock(x,y,z){const id=this.get(x,y,z);if(!id||!Number.isFinite(this.mineTime(id)))return false;if(!this.set(x,y,z,0))return false;this.stats.broken++;if(this.mode==='survival'){const drop=id===1?2:id;this.inv[drop]=(this.inv[drop]||0)+1;if(id===4)this.stats.wood++;if(id===5&&(this.stats.broken%3===0))this.inv.berry=(this.inv.berry||0)+1;}return true;}
  place(x,y,z,id){if(!BLOCKS[id]||id===15||this.get(x,y,z)!==0)return false;if(id===14&&![1,2].includes(this.get(x,y-1,z))){this.message='树苗需要种在草地或泥土上。';return false;}const p=this.player;if(x+1>p.x-.28&&x<p.x+.28&&y+1>p.y&&y<p.y+1.7&&z+1>p.z-.28&&z<p.z+.28){this.message='这里会卡住自己，换一个位置。';return false;}if(this.mode==='survival'&&!(this.inv[id]>0)){this.message='材料不足，先采集或打开 B 制作。';return false;}if(!this.set(x,y,z,id))return false;if(this.mode==='survival')this.inv[id]--;this.stats.placed++;return true;}
  near(id,radius=3){const p=this.player;for(let y=Math.max(1,Math.floor(p.y)-2);y<Math.min(HEIGHT,Math.ceil(p.y)+3);y++)for(let z=Math.floor(p.z-radius);z<=p.z+radius;z++)for(let x=Math.floor(p.x-radius);x<=p.x+radius;x++)if(this.get(x,y,z)===id&&Math.hypot(x+.5-p.x,z+.5-p.z)<radius)return{x,y,z};return null;}
  craft(id){const r=RECIPES.find(r=>r.id===id);if(!r)return false;if(this.mode==='creative'){this.message='创造模式直接从方块库选取，无需制作。';return false;}if(r.upgrade&&this.tools[r.upgrade]){this.message='这件工具已经制作过了。';return false;}if(r.table&&!this.near(10)){this.message='这份配方需要在已放置的工作台附近制作。';return false;}if(Object.entries(r.cost).some(([k,n])=>(this.inv[k]||0)<n)){this.message='材料还不够，配方下方列出了所需材料。';return false;}for(const [k,n]of Object.entries(r.cost))this.inv[k]-=n;for(const [k,n]of Object.entries(r.result||{}))this.inv[k]=(this.inv[k]||0)+n;if(r.upgrade)this.tools[r.upgrade]=true;this.stats.crafted++;this.message='制作完成：'+r.name;return true;}
  eat(){if(!(this.inv.berry>0)){this.message='没有浆果。采集树叶有机会获得浆果。';return false;}if(this.player.food>=100)return false;this.inv.berry--;this.player.food=Math.min(100,this.player.food+24);this.message='吃下浆果，饱食度恢复。';return true;}
  sleep(){if(!this.near(11)){this.message='走到自己放置的床旁再按 E，可设置重生点。';return false;}this.spawn={x:this.player.x,y:this.player.y,z:this.player.z};this.player.hp=100;if(this.night())this.day=Math.floor(this.day/360)*360+45;this.mobs=[];this.message='重生点已设置。休息后精神很好。';return true;}
  night(){return this.day%360>250;}
  respawn(){Object.assign(this.player,this.spawn,{hp:100,food:75});if(this.collides(this.player.x,this.player.y,this.player.z))this.player.y=this.surface(Math.floor(this.player.x),Math.floor(this.player.z));this.mobs=[];this.message='已回到重生点。建筑和背包保留，继续建设家园。';}
  tick(dt){this.day+=dt;updateAnimals(this,dt);if(this.mode==='survival'){const p=this.player;this.foodClock+=dt;if(this.foodClock>=8){this.foodClock=0;p.food=Math.max(0,p.food-1);if(p.food===0)p.hp=Math.max(0,p.hp-3);else if(p.food>60&&p.hp<100)p.hp=Math.min(100,p.hp+1);}if(this.near(12,2.5)&&p.food>0)p.hp=Math.min(100,p.hp+dt*2);if(p.hp<=0)this.respawn();}
    this.growthClock+=dt;if(this.growthClock>25){this.growthClock=0;for(let z=2;z<SIZE-2;z++)for(let x=2;x<SIZE-2;x++)for(let y=1;y<HEIGHT-6;y++)if(this.get(x,y,z)===14){let clear=true;for(let a=1;a<=5;a++)if(this.get(x,y+a,z))clear=false;if(clear){this.set(x,y,z,0);this.tree(x,y,z);}}}
  }
  snapshot(){return{animals:this.animals.map(a=>({species:a.species,x:a.x,y:a.y,z:a.z,heading:a.heading})),version:1,generation:this.generation,mode:this.mode,seed:this.seed,edits:[...this.edits],inv:{...this.inv},tools:{...this.tools},stats:{...this.stats},day:this.day,player:{...this.player},spawn:{...this.spawn}};}
}

