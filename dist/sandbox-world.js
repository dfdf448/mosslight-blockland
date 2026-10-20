import * as THREE from './vendor/three.module.js';
import {BLOCKS,SIZE,HEIGHT,traceVoxel,random} from './sandbox-core.js';
import {animalModel,poseAnimal} from './sandbox-animal-art.js';
import {Explorer} from './characters.js';
import {mergeBlocks} from './geometry.js';

const faces=[
  {n:[1,0,0],v:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]],shade:.82},
  {n:[-1,0,0],v:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],shade:.7},
  {n:[0,1,0],v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],shade:1},
  {n:[0,-1,0],v:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],shade:.55},
  {n:[0,0,1],v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],shade:.9},
  {n:[0,0,-1],v:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]],shade:.75}
];
function textures(){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=32;const ctx=canvas.getContext('2d'),rand=random(1924);
  for(let id=0;id<16;id++){const def=BLOCKS[id]||BLOCKS[2];ctx.fillStyle=def.color;ctx.fillRect(id*32,0,32,32);for(let y=0;y<32;y+=4)for(let x=0;x<32;x+=4){ctx.fillStyle=rand()>.5?'#ffffff09':'#152b2510';ctx.fillRect(id*32+x,y,4,4);}if(id===5){for(let i=0;i<20;i++){ctx.fillStyle=i%2?'#b4cb7b18':'#254c3c18';ctx.fillRect(id*32+Math.floor(rand()*8)*4,Math.floor(rand()*8)*4,8,4);}}
    if(id===0){ctx.fillStyle='#96734f';ctx.fillRect(0,0,32,32);ctx.fillStyle='#88ab60';ctx.fillRect(0,0,32,7);}if(id===4){ctx.fillStyle='#4b382c55';for(let x=2;x<32;x+=7)ctx.fillRect(id*32+x,0,2,32);}if([6,10].includes(id)){ctx.fillStyle='#3b291c44';for(let y=0;y<32;y+=8){ctx.fillRect(id*32,y,32,1);ctx.fillRect(id*32+(y%16?19:7),y,1,8);}}
    if(id===8){ctx.fillStyle='#3f545877';for(let y=0;y<32;y+=8){ctx.fillRect(id*32,y,32,1);ctx.fillRect(id*32+(y%16?8:24),y,1,8);}}
    if(id===7){ctx.strokeStyle='#eaffff';ctx.lineWidth=2;ctx.strokeRect(id*32+1,1,30,30);ctx.fillStyle='#eaffff77';ctx.fillRect(id*32+7,6,3,12);}
    if(id===9){ctx.fillStyle='#fff3b7';ctx.fillRect(id*32+5,5,22,22);ctx.fillStyle='#edc76c';ctx.fillRect(id*32+13,0,5,32);}
    if(id===11){ctx.fillStyle='#f3e4cd';ctx.fillRect(id*32+2,2,28,9);}
    if(id===12){ctx.fillStyle='#ffe5a0';ctx.fillRect(id*32+9,3,13,23);}
  }
  const tex=new THREE.CanvasTexture(canvas);tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;tex.colorSpace=THREE.NoColorSpace;return tex;
}
export class SandboxWorld{
  constructor(canvas){this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#a7cbd2');this.scene.fog=new THREE.Fog('#a7cbd2',35,76);this.camera=new THREE.PerspectiveCamera(75,1,.07,110);this.sun=new THREE.DirectionalLight('#fff1cf',2.1);this.sun.position.set(20,45,15);this.scene.add(this.sun);this.ambient=new THREE.HemisphereLight('#cde8ef','#586345',2);this.scene.add(this.ambient);
    const map=textures();this.materials=[new THREE.MeshBasicMaterial({map,vertexColors:true}),new THREE.MeshBasicMaterial({map,vertexColors:true,transparent:true,opacity:.47,depthWrite:false}),new THREE.MeshBasicMaterial({map,vertexColors:true})];for(const material of this.materials){material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>','');};material.customProgramCacheKey=()=> 'sandbox-display-baked-v1';}this.chunks=new Map();this.hero=new Explorer(this.scene);this.hero.lantern.visible=false;this.hero.root.scale.setScalar(.86);this.hero.glider.visible=false;
    this.outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012,1.012,1.012)),new THREE.LineBasicMaterial({color:'#fff4bc',transparent:true,opacity:.85}));this.outline.visible=false;this.scene.add(this.outline);
    const sea=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshLambertMaterial({color:'#6fadaf'}));sea.rotation.x=-Math.PI/2;sea.position.set(24,.25,24);this.scene.add(sea);
    this.animalMeshes=[];this.animalRay=new THREE.Ray();this.animalBox=new THREE.Box3();this.animalHit=new THREE.Vector3();this.mobMeshes=[];for(let i=0;i<5;i++){const mesh=mergeBlocks([[0,.42,0,.7,.6,.9,'#687779'],[0,.83,-.23,.55,.4,.5,'#90a09b'],[-.16,.85,-.5,.08,.09,.03,'#edc58c'],[.16,.85,-.5,.08,.09,.03,'#edc58c']]);mesh.visible=false;this.scene.add(mesh);this.mobMeshes.push(mesh);}
    this.scene.add(this.camera);this.hand=new THREE.Group();this.camera.add(this.hand);const arm=new THREE.Mesh(new THREE.BoxGeometry(.13,.23,.17),new THREE.MeshBasicMaterial({color:'#d6ad81'}));arm.position.set(.36,-.37,-.56);arm.rotation.z=.2;this.hand.add(arm);this.heldBlock=new THREE.Mesh(new THREE.BoxGeometry(.19,.19,.19),new THREE.MeshBasicMaterial({color:'#96734f'}));this.heldBlock.position.set(.35,-.23,-.59);this.heldBlock.rotation.set(.15,-.3,.1);this.hand.add(this.heldBlock);this.hand.visible=false;this.direction=new THREE.Vector3();this.skyDay=new THREE.Color('#a7cbd2');this.skyNight=new THREE.Color('#253c56');this.resize();
  }
  resize(){const w=innerWidth,h=innerHeight,r=Math.min(devicePixelRatio,1.5,1920/w,1080/h);this.renderer.setPixelRatio(r);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  setWorld(world){for(const mesh of this.animalMeshes){this.scene.remove(mesh);mesh.traverse(part=>{if(part.isMesh)part.geometry.dispose();});}this.animalMeshes=world.animals.map(a=>{const mesh=animalModel(a.species);this.scene.add(mesh);poseAnimal(mesh,a);return mesh;});for(const mesh of this.chunks.values()){this.scene.remove(mesh);mesh.geometry.dispose();}this.chunks.clear();this.world=world;this.rebuild(36);}
  build(cx,cz){const groups=[[],[],[]];for(let y=0;y<HEIGHT;y++)for(let z=cz*8;z<cz*8+8;z++)for(let x=cx*8;x<cx*8+8;x++){const id=this.world.get(x,y,z);if(!id)continue;for(const f of faces){const adjacent=this.world.get(x+f.n[0],y+f.n[1],z+f.n[2]);if(adjacent&&!(adjacent===7&&id!==7))continue;groups[id===7?1:[9,12].includes(id)?2:0].push({x,y,z,id,f});}}
    const positions=[],normals=[],colors=[],uvs=[],indices=[],ranges=[];for(let group=0;group<3;group++){const start=indices.length;for(const {x,y,z,id,f}of groups[group]){const base=positions.length/3,offset=(id===1?(f.n[1]===1?1:f.n[1]===-1?2:0):id)/16;f.v.forEach((v,i)=>{positions.push(x+v[0],y+v[1],z+v[2]);normals.push(...f.n);colors.push(f.shade,f.shade,f.shade);const uv=[[0,0],[1,0],[1,1],[0,1]][i];uvs.push(offset+(.5+uv[0]*31)/512,(.5+uv[1]*31)/32);});indices.push(base,base+1,base+2,base,base+2,base+3);}ranges.push([start,indices.length-start,group]);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);for(const range of ranges)g.addGroup(...range);g.computeBoundingSphere();const key=cx+','+cz,old=this.chunks.get(key);if(old){this.scene.remove(old);old.geometry.dispose();}const mesh=new THREE.Mesh(g,this.materials);this.chunks.set(key,mesh);this.scene.add(mesh);
  }
  rebuild(limit=3){let count=0;for(const key of this.world.dirty){const [cx,cz]=key.split(',').map(Number);this.build(cx,cz);this.world.dirty.delete(key);if(++count>=limit)break;}}
  update(player,yaw,pitch,view,dt,speed=0){const world=this.world,p=player,forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)),eye=new THREE.Vector3(p.x,p.y+1.48,p.z);this.camera.position.copy(eye);
    if(view==='third'){const desired=new THREE.Vector3(Math.sin(yaw)*4.5,2,Math.cos(yaw)*4.5),length=desired.length();desired.normalize();const hit=traceVoxel(world,eye,desired,length);this.camera.position.addScaledVector(desired,hit?Math.max(.15,hit.distance-.2):length);}
    this.camera.lookAt(eye.clone().addScaledVector(forward,9));this.camera.updateMatrixWorld();this.hero.update({x:p.x,y:p.y+1.65,z:p.z,yaw},dt,{speed,heading:yaw,first:view==='first',floor:p.y});this.hero.glider.visible=false;this.hero.lantern.visible=false;this.hero.root.scale.setScalar(.86);
    const t=world.day%360,night=t>250?Math.min(1,(t-250)/22):t<25?1-t/25:0;this.scene.background.copy(this.skyDay).lerp(this.skyNight,night);this.scene.fog.color.copy(this.scene.background).convertLinearToSRGB();for(let i=0;i<2;i++)this.materials[i].color.setScalar(1-night*.65);this.sun.intensity=2.1-night*1.65;this.ambient.intensity=1.8-night*1.1;this.mobMeshes.forEach((mesh,i)=>{const m=world.mobs[i];mesh.visible=!!m;if(m){mesh.position.set(m.x,m.y,m.z);mesh.rotation.y=m.angle;}});this.animalMeshes.forEach((mesh,i)=>{const a=world.animals[i];mesh.visible=!!a;if(a)poseAnimal(mesh,a);});this.rebuild();
  }
  target(){this.camera.getWorldDirection(this.direction);const hit=traceVoxel(this.world,this.camera.position,this.direction,14);if(hit&&Math.hypot(hit.x+.5-this.world.player.x,hit.y+.5-(this.world.player.y+1),hit.z+.5-this.world.player.z)>7)return null;return hit;}
  animalTarget(){this.camera.getWorldDirection(this.direction);this.animalRay.set(this.camera.position,this.direction);const wall=traceVoxel(this.world,this.camera.position,this.direction,14);let found=null,best=wall?.distance??14;for(const a of this.world.animals){if(Math.hypot(a.x-this.world.player.x,a.y-this.world.player.y,a.z-this.world.player.z)>6)continue;this.animalBox.min.set(a.x-.55,a.y,a.z-.75);this.animalBox.max.set(a.x+.55,a.y+1.4,a.z+.85);if(this.animalRay.intersectBox(this.animalBox,this.animalHit)){const distance=this.animalHit.distanceTo(this.camera.position);if(distance<best){best=distance;found=a;}}}return found;}
  selection(hit){this.outline.visible=!!hit;if(hit)this.outline.position.set(hit.x+.5,hit.y+.5,hit.z+.5);}
  render(){this.renderer.render(this.scene,this.camera);}
  metrics(){return{drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,width:this.renderer.domElement.width,height:this.renderer.domElement.height,chunks:this.chunks.size};}
}


