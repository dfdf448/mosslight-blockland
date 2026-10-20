import * as THREE from './vendor/three.module.js';
import { mergeBlocks } from './geometry.js';
import { createVillager, createCompanion } from './characters.js';

export const PEOPLE = [
  {id:'milo',name:'米洛',role:'守灯人',x:-3,z:17,color:'#78836a',hat:'#c4b584',kind:'elder'},
  {id:'he',name:'小禾',role:'风行信使',x:-19,z:-6,color:'#b27b57',hat:'#cbbc7f',kind:'courier'},
  {id:'lan',name:'岚',role:'回响研究员',x:7,z:17,color:'#668a93',hat:'#a4b3a0',kind:'researcher'}
];
export const RACE_POINTS = [
  [-18,-10,1.5],[-23,-8,1.5],[-29,-8,3.0],[-34,-12,1.7],[-32,-19,3.0],[-27,-23,1.5]
];
const emptyState=()=>({motes:[],quests:{delivery:false,echo:false,race:false},raceBest:null,met:[]});
export function parseAdventure(v) {
  const state=emptyState();if(!v||typeof v!=='object')return state;
  state.motes=[...new Set(Array.isArray(v.motes)?v.motes.filter(n=>Number.isInteger(n)&&n>=0&&n<6):[])];
  for(const q of ['delivery','echo','race'])state.quests[q]=v.quests?.[q]===true;
  state.raceBest=Number.isFinite(v.raceBest)&&v.raceBest>0&&v.raceBest<=120?v.raceBest:null;
  state.met=Array.isArray(v.met)?v.met.filter(n=>['milo','he','lan'].includes(n)):[];
  if(state.quests.delivery&&!([0,1,2].every(n=>state.motes.includes(n))))state.quests.delivery=false;
  if(state.quests.echo&&!([3,4,5].every(n=>state.motes.includes(n))))state.quests.echo=false;
  return state;
}
export class Adventures {
  constructor({scene,ground,obstacles,state,toast,audio,changed,showDialog,closeDialog}) {
    Object.assign(this,{scene,ground,obstacles,toast,audio,changed,showDialog,closeDialog});
    this.state=parseAdventure(state);this.motes=new Set(this.state.motes);this.echo=false;this.energy=1;this.race=null;this.cooldown=0;this.time=0;
    this.people=PEOPLE.map(p=>({...p,y:ground(p.x,p.z)}));
    this.models=this.people.map(p=>{obstacles.push({x:p.x,z:p.z,r:.45});return createVillager(scene,p);});
    this.companion=createCompanion(scene);
    this.platforms=[];const base=Math.max(0,ground(9,20));
    [9,12,15,18,21].forEach((x,i)=>this.platforms.push({x,z:20,y:base+.5+i*.8,width:2.45}));
    const platformBlocks=[];
    for(const p of this.platforms){platformBlocks.push([p.x,p.y-.12,p.z,2.45,.24,2.45,'#91c8b7']);for(const dx of [-1,1])platformBlocks.push([p.x+dx,p.y+.025,p.z,.08,.06,1.9,'#e1ead2']);}
    this.platformMesh=mergeBlocks(platformBlocks);scene.add(this.platformMesh);this.platformMesh.visible=false;
    this.seeds=[{x:-9,z:20,y:ground(-9,20)+.6},{x:7,z:11,y:ground(7,11)+.6},{x:2,z:25,y:ground(2,25)+.6},
      ...[1,3,4].map(i=>({x:this.platforms[i].x,z:20,y:this.platforms[i].y+.65,top:this.platforms[i].y,echo:true}))];
    const gemGeometry=new THREE.OctahedronGeometry(.24);const gemMaterial=new THREE.MeshBasicMaterial({color:'#f4d78c'});
    this.seedMesh=new THREE.InstancedMesh(gemGeometry,gemMaterial,6);this.seedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.seedMesh.frustumCulled=false;scene.add(this.seedMesh);
    const ringGeometry=new THREE.TorusGeometry(1.15,.08,4,12);this.ringMesh=new THREE.InstancedMesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#e9ca7b'}),RACE_POINTS.length);this.ringMesh.frustumCulled=false;scene.add(this.ringMesh);this.ringMesh.visible=false;
    this.dummy=new THREE.Object3D();
    this.labelRoot=document.createElement('div');this.labelRoot.id='peopleLabels';document.getElementById('hud').append(this.labelRoot);
    this.labels=this.people.map(p=>{const label=document.createElement('div');label.className='person-label';label.innerHTML='<b>'+p.name+'</b><small>'+p.role+'</small>';this.labelRoot.append(label);return label;});
    this.labelVector=new THREE.Vector3();this.sync();
  }
  export(){return {...this.state,motes:[...this.motes],quests:{...this.state.quests}};}
  reset(){this.state=emptyState();this.motes.clear();this.echo=false;this.energy=1;this.race=null;this.cooldown=0;this.platformMesh.visible=false;this.sync();}
  toggleEcho(){if(!this.echo&&this.energy<.2){this.toast('萤仔需要喘口气，等共鸣能量恢复后再试。');return;}this.echo=!this.echo;this.platformMesh.visible=this.echo;this.audio.tone(this.echo?523:330,.8,.3);this.toast(this.echo?'回响开启 · 蓝色踏桥显现。二段跳跃，按住空格可滑翔。':'回到现世 · 共鸣能量正在恢复。');}
  surface(x,z,previousFeet,nextFeet,vy){let best=-Infinity;if(!this.echo)return best;for(const p of this.platforms)if(Math.abs(x-p.x)<p.width/2+.15&&Math.abs(z-p.z)<p.width/2+.15&&vy<=0&&previousFeet>=p.y-.12&&nextFeet<=p.y+.04)best=Math.max(best,p.y);return best;}
  standingSurface(x,z,feet){if(!this.echo)return -Infinity;let best=-Infinity;for(const p of this.platforms)if(Math.abs(x-p.x)<p.width/2+.15&&Math.abs(z-p.z)<p.width/2+.15&&Math.abs(feet-p.y)<.14)best=Math.max(best,p.y);return best;}
  nearest(player){let result=null,distance=2.45;
    for(const p of this.people){const d=Math.hypot(player.x-p.x,player.z-p.z);if(d<distance){distance=d;result={type:'person',id:p.id,x:p.x,z:p.z,label:'交谈 · '+p.name+'（'+p.role+'）'};}}
    this.seeds.forEach((s,i)=>{if(this.motes.has(i)||(s.echo&&!this.echo))return;const d=Math.hypot(player.x-s.x,player.z-s.z,player.y-s.y);if(d<1.7&&d<distance&&(!s.echo||player.y-1.65>=s.top-.35)){distance=d;result={type:'seed',id:i,x:s.x,z:s.z,label:s.echo?'拾取空中的回响碎片':'采集海岸萤种'};}});return result;
  }
  interact(target){if(target.type==='seed'){this.motes.add(target.id);this.audio.tone(target.id<3?659:880,1,.3);this.toast(target.id<3?'拾得萤种 · '+[0,1,2].filter(i=>this.motes.has(i)).length+'/3，收齐后交给米洛。':'拾得回响碎片 · '+[3,4,5].filter(i=>this.motes.has(i)).length+'/3，收齐后交给岚。');this.sync();this.changed();return;}this.talk(target.id);}
  talk(id){if(!this.state.met.includes(id))this.state.met.push(id);this.changed();const makeButton=(label,action)=>({label,action});
    if(id==='milo'){
      const ready=[0,1,2].every(i=>this.motes.has(i));
      this.showDialog('米洛 · 守灯人','你是阿苔吧？萤仔已经等你好久了。灯塔需要三枚晶核；我还需要三颗海岸萤种，为灯盏添上温柔的光。沿岸边和营地石径找找。',[
        makeButton(this.state.quests.delivery?'萤种已经交付，看看委托':'交付海岸萤种（'+[0,1,2].filter(i=>this.motes.has(i)).length+'/3）',()=>{if(ready&&!this.state.quests.delivery){this.state.quests.delivery=true;this.reward('米洛把“归航徽章”别在你的背包上。',id);}else this.toast(this.state.quests.delivery?'谢谢你，灯盏里一直有你的光。':'还差萤种：营地西岸、东侧石径、南边浅滩。');}),
        makeButton('教我新动作',()=>this.showDialog('阿苔的旅行本领','空格跳跃，再按一次是二段跳；下落时按住空格可展开滑翔翼。F 冲刺，Q 与萤仔共鸣，V 切换第一/第三人称。靠近人物或物件按 E 互动。',[]))]);
    }else if(id==='he'){
      this.showDialog('小禾 · 风行信使','想看看岛屿的另一面吗？穿过六道风环，把风的消息带回来。高处的环需要二段跳和滑翔。途中可以按 F 冲刺，也能随时取消，重新挑战。',[
        makeButton(this.race?'重新开始风环挑战':'开始风环挑战',()=>{this.closeDialog();this.startRace();}),
        makeButton('查看我的最好成绩',()=>this.toast(this.state.raceBest?'最好成绩 '+this.state.raceBest.toFixed(1)+' 秒。再来一次？':'还没有成绩。风会给愿意尝试的人让路。'))]);
    }else{
      const ready=[3,4,5].every(i=>this.motes.has(i));
      this.showDialog('岚 · 回响研究员','萤仔能够看见世界留下的回响。按 Q，海湾上会出现蓝色的阶梯。用二段跳和滑翔登上去，找回三枚空中的回响碎片。共鸣能量不够时，可以先落回岸边休息。',[
        makeButton('交付回响碎片（'+[3,4,5].filter(i=>this.motes.has(i)).length+'/3）',()=>{if(ready&&!this.state.quests.echo){this.state.quests.echo=true;this.reward('岚为萤仔装上了一对星光翅膀。',id);}else this.toast(this.state.quests.echo?'你已经找回了全部回响。':'在我东边的海湾按 Q，蓝色踏桥会引导你。');})]);
    }
  }
  reward(text,id){this.audio.success();this.closeDialog();this.toast('委托完成 · '+text);this.changed();this.sync();}
  startRace(){this.race={index:0,time:0,limit:65};this.sync();this.toast('风环挑战开始 · 依次穿过发光的环，高环需要跳跃。按 T 取消。');}
  cancelRace(){if(!this.race)return;this.race=null;this.sync();this.toast('风环挑战已取消。找小禾可以重新开始。');}
  sync(){this.ringMesh.visible=!!this.race;this.refreshSeeds();this.refreshRings();}
  refreshSeeds(){this.seeds.forEach((s,i)=>{this.dummy.position.set(s.x,s.y+Math.sin(this.time*2+i)*.08,s.z);this.dummy.rotation.set(0,this.time*.8,Math.PI/8);this.dummy.scale.setScalar(this.motes.has(i)||(s.echo&&!this.echo)?0:1);this.dummy.updateMatrix();this.seedMesh.setMatrixAt(i,this.dummy.matrix);});this.seedMesh.instanceMatrix.needsUpdate=true;}
  refreshRings(){RACE_POINTS.forEach((p,i)=>{this.dummy.position.set(p[0],this.ground(p[0],p[1])+p[2],p[1]);const next=RACE_POINTS[Math.min(i+1,RACE_POINTS.length-1)];this.dummy.rotation.set(0,Math.atan2(next[0]-p[0],next[1]-p[1]),0);this.dummy.scale.setScalar(!this.race||i<this.race.index?0:i===this.race.index?1:.65);this.dummy.updateMatrix();this.ringMesh.setMatrixAt(i,this.dummy.matrix);this.ringMesh.setColorAt(i,new THREE.Color(i===this.race?.index?'#fff0bc':'#75978a'));});this.ringMesh.instanceMatrix.needsUpdate=true;if(this.ringMesh.instanceColor)this.ringMesh.instanceColor.needsUpdate=true;}
  tick(player,dt,time){this.time=time;if(this.echo){this.energy=Math.max(0,this.energy-dt*.065);if(this.energy===0){this.echo=false;this.platformMesh.visible=false;this.toast('回响渐渐散去。落回岸边，稍候再与萤仔共鸣。');}}else this.energy=Math.min(1,this.energy+dt*.13);
    if(this.race){this.race.time+=dt;if(this.race.time>this.race.limit){this.race=null;this.sync();this.toast('这次风停了。找小禾再挑战一次，已经完成的委托不会丢失。');}else{const p=RACE_POINTS[this.race.index];if(Math.hypot(player.x-p[0],player.z-p[1],player.y-(this.ground(p[0],p[1])+p[2]))<1.28){this.audio.tone(440+this.race.index*70,.45,.22);this.race.index++;if(this.race.index===RACE_POINTS.length){const result=this.race.time;this.state.raceBest=Math.min(this.state.raceBest||Infinity,result);this.state.quests.race=true;this.race=null;this.toast('风行试炼完成 · '+result.toFixed(1)+' 秒！获得信使徽章。');this.audio.success();this.changed();}this.refreshRings();this.ringMesh.visible=!!this.race;}}}
  }
  visual(player,dt,time,camera){
    const target=new THREE.Vector3(player.x+Math.cos(player.yaw)*.9,player.y+.35+Math.sin(time*2)*.12,player.z-Math.sin(player.yaw)*.9);
    this.companion.position.lerp(target,1-Math.exp(-dt*5));this.companion.rotation.y=player.yaw;this.companion.rotation.z=Math.sin(time*3)*.13;this.companion.scale.setScalar(this.state.quests.echo?1.3:1);
    for(let i=0;i<this.models.length;i++){const m=this.models[i];m.position.y=this.people[i].y+Math.sin(time*1.4+i)*.012;if(Math.hypot(player.x-this.people[i].x,player.z-this.people[i].z)<7)m.rotation.y=Math.atan2(this.people[i].x-player.x,this.people[i].z-player.z);}
    this.refreshSeeds();
  }
  updateLabels(player,camera){for(let i=0;i<this.people.length;i++){const p=this.people[i],distance=Math.hypot(player.x-p.x,player.z-p.z);this.labelVector.set(p.x,p.y+2.5,p.z).project(camera);const visible=distance<18&&this.labelVector.z<1&&this.labelVector.z>-1&&Math.abs(this.labelVector.x)<1.1;const label=this.labels[i];label.style.display=visible?'block':'none';if(visible)label.style.transform='translate(-50%,-100%) translate('+((this.labelVector.x+1)/2*innerWidth)+'px,'+((-this.labelVector.y+1)/2*innerHeight)+'px)';}}
  taskText(){const q=this.state.quests;return (q.delivery?'✓':'○')+' 米洛的萤种 '+[0,1,2].filter(i=>this.motes.has(i)).length+'/3\n'+(q.echo?'✓':'○')+' 岚的回响 '+[3,4,5].filter(i=>this.motes.has(i)).length+'/3\n'+(q.race?'✓':'○')+' 小禾的风环';}
}
