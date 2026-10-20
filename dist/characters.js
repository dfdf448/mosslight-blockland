import * as THREE from './vendor/three.module.js';
import { mergeBlocks } from './geometry.js';

const block = (x,y,z,sx,sy,sz,c) => [x,y,z,sx,sy,sz,c];
function bodyBlocks(coat='#537f78',hat='#d9b676',skin='#e4bb91',scarf='#c66f59') {
  return [block(0,1.05,0,.47,.55,.32,coat),block(0,.75,0,.45,.13,.34,'#745b42'),block(0,1.5,0,.41,.4,.4,skin),
    block(0,1.73,0,.67,.09,.63,hat),block(0,1.85,.02,.44,.2,.44,hat),block(0,1.73,0,.46,.09,.45,'#7d6246'),
    block(-.095,1.51,-.208,.06,.065,.025,'#243a35'),block(.095,1.51,-.208,.06,.065,.025,'#243a35'),block(0,1.42,-.225,.09,.045,.04,'#b57e65'),
    block(0,1.29,0,.51,.12,.4,scarf),block(.12,1.1,.23,.15,.36,.07,scarf),block(0,1.0,.27,.36,.46,.22,'#896b46'),block(0,1.28,.29,.42,.1,.23,'#cfbb86'),
    block(0,.95,-.175,.06,.24,.025,'#d7c79d')];
}
const armBlocks=(skin,coat)=>[block(0,-.19,0,.17,.38,.2,coat),block(0,-.43,0,.18,.16,.2,skin)];
const legBlocks=()=>[block(0,-.22,0,.18,.4,.22,'#56635c'),block(0,-.52,-.035,.21,.26,.31,'#514b3e')];
export class Explorer {
  constructor(scene) {
    this.root=new THREE.Group();this.root.name='旅行者阿苔';scene.add(this.root);
    this.body=mergeBlocks(bodyBlocks());this.root.add(this.body);
    this.deliveryBadge=mergeBlocks([block(.1,1.12,-.18,.09,.09,.04,'#f5d58c')]);this.body.add(this.deliveryBadge);this.deliveryBadge.visible=false;
    this.raceBadge=mergeBlocks([block(-.1,1.12,-.18,.09,.09,.04,'#b6d6b8')]);this.body.add(this.raceBadge);this.raceBadge.visible=false;
    this.joints={};
    for(const [name,x,y,blocks] of [['armL',-.34,1.23,armBlocks('#e4bb91','#537f78')],['armR',.34,1.23,armBlocks('#e4bb91','#537f78')],['legL',-.14,.65,legBlocks()],['legR',.14,.65,legBlocks()]]) {
      const joint=new THREE.Group();joint.position.set(x,y,0);joint.add(mergeBlocks(blocks));this.root.add(joint);this.joints[name]=joint;
    }
    this.lantern=mergeBlocks([block(0,-.58,-.05,.2,.25,.2,'#e2b76d'),block(0,-.58,-.05,.14,.16,.21,'#fff0ac'),block(0,-.74,-.05,.25,.05,.25,'#655e45')]);this.joints.armR.add(this.lantern);
    this.glider=mergeBlocks([block(0,1.9,.1,3.3,.06,1.2,'#dcc18b'),block(-1.15,1.8,.1,1,.07,1.1,'#a6b889'),block(1.15,1.8,.1,1,.07,1.1,'#a6b889'),block(0,1.8,.1,.07,.23,1.4,'#836c46')]);this.root.add(this.glider);this.glider.visible=false;
    const shadowMat=new THREE.MeshBasicMaterial({color:'#203c32',transparent:true,opacity:.22,depthWrite:false});
    this.shadow=new THREE.Mesh(new THREE.CircleGeometry(.45,12),shadowMat);this.shadow.rotation.x=-Math.PI/2;scene.add(this.shadow);
    this.facing=0;this.phase=0;
  }
  update(player,dt,{speed=0,heading=player.yaw,gliding=false,first=false,floor=0,dashing=false}={}) {
    this.root.visible=!first;this.root.position.set(player.x,player.y-1.65,player.z);
    let delta=Math.atan2(Math.sin(heading-this.facing),Math.cos(heading-this.facing));this.facing+=delta*(1-Math.exp(-dt*14));this.root.rotation.y=this.facing;
    this.phase+=speed*dt*2.8;const swing=Math.sin(this.phase)*Math.min(.72,speed*.12);
    this.joints.legL.rotation.x=swing;this.joints.legR.rotation.x=-swing;this.joints.armL.rotation.x=-swing*.7;this.joints.armR.rotation.x=swing*.55-.1;
    if(gliding){this.joints.armL.rotation.z=-1;this.joints.armR.rotation.z=1;}else{this.joints.armL.rotation.z=0;this.joints.armR.rotation.z=0;}
    this.body.position.y=speed>0?Math.abs(Math.sin(this.phase))*.025:Math.sin(performance.now()*.0018)*.008;
    this.glider.visible=gliding;this.root.rotation.x=dashing?-.2:0;
    this.shadow.position.set(player.x,floor+.025,player.z);this.shadow.scale.setScalar(Math.max(.45,1-(player.y-1.65-floor)*.1));this.shadow.visible=!first;
  }
}
export function createVillager(scene,{x,z,y,name,color,hat,kind}) {
  const parts=bodyBlocks(color,hat,'#d9b28e',kind==='elder'?'#d7d6ba':'#c77c5e');
  for(const [side,x] of [[-1,-.33],[1,.33]]){for(const b of armBlocks('#d9b28e',color))parts.push([b[0]+x,b[1]+1.22,b[2],...b.slice(3)]);for(const b of legBlocks())parts.push([b[0]+side*.14,b[1]+.65,b[2],...b.slice(3)]);}
  if(kind==='elder')parts.push(block(0,1.36,-.24,.33,.17,.06,'#e7e2c9'));
  if(kind==='researcher')parts.push(block(0,1.51,-.23,.33,.04,.04,'#373e46'));
  const mesh=mergeBlocks(parts);mesh.position.set(x,y,z);mesh.userData={name,baseY:y};mesh.rotation.y=Math.PI;scene.add(mesh);return mesh;
}
export function createCompanion(scene) {
  const material=new THREE.MeshBasicMaterial({vertexColors:true});
  const mesh=mergeBlocks([block(0,0,0,.26,.3,.26,'#f8dc8c'),block(0,.2,0,.15,.12,.15,'#f3edce'),block(-.24,0,0,.26,.06,.12,'#b2ded0'),block(.24,0,0,.26,.06,.12,'#b2ded0'),block(-.06,.02,-.14,.035,.04,.025,'#35574c'),block(.06,.02,-.14,.035,.04,.025,'#35574c')],material);
  mesh.position.set(1,2,20);scene.add(mesh);return mesh;
}
