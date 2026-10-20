const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const {Sandbox,traceVoxel,SIZE}=await import('./dist/sandbox-core.js');const s=new Sandbox('survival');
assert.deepEqual(s.inv,{});const y=s.surface(27,37)-1;
let treeY;for(let i=1;i<20;i++)if(s.get(30,i,37)===4){treeY=i;break;}assert(Number.isInteger(treeY));assert(s.breakBlock(30,treeY,37));assert.equal(s.inv[4],1);assert(s.craft('plank'));assert.equal(s.inv[6],4);assert.equal(s.inv[4],0);
assert.equal(s.craft('pick'),false,'不足材料不能制作');assert.equal(s.inv[6],4);s.inv[4]=1;assert(s.craft('pick'));assert(s.tools.pick);assert.equal(s.inv[6],1);const before={...s.inv};assert(!s.craft('pick'));assert.deepEqual(s.inv,before,'重复工具不扣材料');
const stoneY=1;assert.equal(s.get(24,stoneY,38),3);assert(s.breakBlock(24,stoneY,38));assert.equal(s.inv[3],1);s.inv[3]=4;s.inv[4]=2;assert(!s.craft('axe'),'工作台附近才能制作石斧');
const ground=s.surface(23,38);s.inv[10]=1;assert(s.place(23,ground,38,10));assert(s.craft('axe'));assert(s.tools.axe);
const p={...s.player};s.inv[6]=4;assert(!s.place(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z),6),'不能把自己埋在方块中');assert.equal(s.inv[6],4);
const buildY=s.surface(25,38);assert(s.place(25,buildY,38,6));assert(s.place(25,buildY+1,38,6));assert.equal(s.inv[6],2);const resumed=new Sandbox('survival',s.snapshot());assert.equal(resumed.get(25,buildY+1,38),6);assert.equal(resumed.inv[6],2);assert(resumed.tools.axe);
assert(!s.breakBlock(24,0,38),'基岩不可破坏');assert(!s.place(-1,3,0,6),'越界放置拒绝');
const c=new Sandbox('creative');const cy=c.surface(25,38);for(let dy=0;dy<5;dy++)assert(c.place(25,cy+dy,38,7));assert.deepEqual(c.inv,{});assert(c.breakBlock(25,cy+4,38));assert.equal(c.get(25,cy+3,38),7);
const hit=traceVoxel(c,{x:25.5,y:cy+8,z:38.5},{x:0,y:-1,z:0},10);assert.equal(hit.y,cy+3);assert.deepEqual(hit.normal,{x:0,y:1,z:0});
let sx=8,sz=40,saplingY;outer:for(let z=40;z<43;z++)for(let x=7;x<40;x++){const h=c.surface(x,z);if(c.get(x,h-1,z)===1){sx=x;sz=z;saplingY=h;break outer;}}assert(c.place(sx,saplingY,sz,14));c.tick(26);assert.equal(c.get(sx,saplingY,sz),4,'种下的树苗会长成树');
s.player.food=50;s.inv.berry=1;assert(s.eat());assert.equal(s.player.food,74);s.day=300;s.inv[11]=1;const bedY=s.surface(22,38);assert(s.place(22,bedY,38,11));assert(s.sleep());assert(!s.night());assert.equal(s.player.hp,100);
const invalid=s.snapshot();invalid.edits.push([0,0],[-1,6],[SIZE*SIZE*24+4,6],[2500,99]);const safe=new Sandbox('survival',invalid);assert.equal(safe.get(0,0,0),15);assert(!safe.data.includes(99));
fs.writeFileSync('qa-sandbox-core.json',JSON.stringify({ok:true,checks:['生存空手开局与砍树掉落','木板/工具配方与材料不足保护','工作台距离限制','多层建造和自身碰撞保护','保存恢复建筑与材料工具','创造无限建造拆除','基岩与边界保护','体素射线命中及放置面','重新种树生长','浆果补充饥饿与床跳过夜晚','异常存档过滤']},null,2));console.log('沙盒核心规则验收通过');})().catch(e=>{console.error(e);process.exitCode=1;});



