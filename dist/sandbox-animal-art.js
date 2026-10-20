import * as THREE from './vendor/three.module.js';
import {mergeBlocks} from './geometry.js';
const material=new THREE.MeshLambertMaterial({vertexColors:true});
const block=(x,y,z,sx,sy,sz,c)=>[x,y,z,sx,sy,sz,c];
export function animalModel(species){const cow=species==='cow',root=new THREE.Group(),body=new THREE.Group();root.add(body);const blocks=cow?[
  block(0,.78,0,.78,.65,1.2,'#e6e0cb'),block(-.398,.83,-.18,.025,.35,.46,'#574b40'),block(.398,.76,.25,.025,.39,.48,'#574b40'),block(.1,1.11,.1,.42,.02,.42,'#574b40'),
  block(0,.9,.71,.55,.52,.49,'#6e5b48'),block(0,.76,.99,.51,.21,.14,'#d6a49c'),block(-.18,.99,.97,.075,.075,.035,'#252f2d'),block(.18,.99,.97,.075,.075,.035,'#252f2d'),block(-.34,1.02,.7,.2,.14,.18,'#8d755a'),block(.34,1.02,.7,.2,.14,.18,'#8d755a'),block(-.21,1.22,.72,.08,.22,.08,'#e5d6ae'),block(.21,1.22,.72,.08,.22,.08,'#e5d6ae'),block(0,.75,-.69,.07,.5,.07,'#6e5b48')
]:[
  block(0,.69,0,.84,.65,1.06,'#ece6d2'),block(-.43,.66,-.15,.13,.4,.49,'#dbdcc9'),block(.43,.73,.15,.13,.4,.49,'#faf0d7'),block(0,1.04,-.16,.5,.13,.58,'#faf0d7'),
  block(0,.82,.64,.43,.43,.42,'#95816a'),block(0,1.05,.58,.48,.18,.4,'#f4ebd5'),block(-.14,.87,.86,.07,.07,.025,'#25352f'),block(.14,.87,.86,.07,.07,.025,'#25352f'),block(0,.7,.875,.21,.12,.035,'#c4a48d'),block(-.28,.9,.61,.18,.12,.18,'#a7957c'),block(.28,.9,.61,.18,.12,.18,'#a7957c')
];body.add(mergeBlocks(blocks,material));const legs=[];for(const x of [-.25,.25])for(const z of [-.36,.36]){const leg=new THREE.Group();leg.position.set(x,.43,z);leg.add(mergeBlocks([block(0,-.17,0,.17,.35,.18,cow?'#cfc9b3':'#a28e75'),block(0,-.36,.015,.19,.12,.22,'#514e43')],material));root.add(leg);legs.push(leg);}root.userData={body,legs,species};return root;}
export function poseAnimal(root,a){root.position.set(a.x,a.y,a.z);root.rotation.y=a.heading;const {body,legs}=root.userData;body.rotation.x=a.grazing?.06:0;body.position.y=a.moving?Math.sin(a.phase*8)*.016:0;legs.forEach((leg,i)=>leg.rotation.x=a.moving?Math.sin(a.phase*8+(i===0||i===3?0:Math.PI))*.32:0);}
