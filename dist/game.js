import * as THREE from './vendor/three.module.js';
import { readProgress, readSettings, parseProgress, SAVE_KEY, SETTINGS_KEY } from './progress.js';
import { IslandAudio } from './ambient.js';
import { IslandTrials, TRIAL_HINTS, MEMORIES } from './trials.js';
import { mergeWorld, terrainMesh, mergeBlocks } from './geometry.js';
import { Explorer } from './characters.js';
import { Adventures, PEOPLE, RACE_POINTS } from './adventures.js';
import { ObstacleGrid } from './collision.js';
function safeStorage(){try{return window.localStorage;}catch{return null;}}
const settings = readSettings(safeStorage());try{const store=safeStorage();if(store?.getItem('mosslight-explore-visual-v3')!=='1'){settings.quality=1.3;settings.autoQuality=false;settings.motion=false;store?.setItem(SETTINGS_KEY,JSON.stringify(settings));store?.setItem('mosslight-explore-visual-v3','1');}}catch{}
let saved = readProgress(safeStorage());
const islandAudio = new IslandAudio(); islandAudio.setVolume(settings.volume);

const $=id=>document.getElementById(id), clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const scene=new THREE.Scene();scene.background=new THREE.Color('#bfd5c0');scene.fog=new THREE.Fog('#bfd5c0',36,115);
const camera=new THREE.PerspectiveCamera(settings.fov,innerWidth/innerHeight,.08,180);camera.rotation.order='YXZ';
const renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
const hemi=new THREE.HemisphereLight('#ffe9bd','#335e50',2.1);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff0cb',2.5);sun.position.set(-35,65,20);scene.add(sun);
const box=new THREE.BoxGeometry(1,1,1),matCache=new Map(),dummy=new THREE.Object3D();
function material(color){if(!matCache.has(color))matCache.set(color,new THREE.MeshLambertMaterial({color}));return matCache.get(color)}
function cube(x,y,z,sx,sy,sz,color,parent=scene){const m=new THREE.Mesh(box,material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m}
let seed=417;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const N=112,S=1.2,half=N*S/2,heights=new Float32Array(N*N),regions=[{x:-28,z:-18,r:16},{x:28,z:-20,r:16},{x:0,z:-38,r:15}];
const index=(i,j)=>j*N+i;
function rawHeight(x,z){let land=1-Math.hypot(x/29,z/27);for(const p of regions)land=Math.max(land,1-Math.hypot(x-p.x,z-p.z)/p.r);const d1=Math.abs(z+.55*x+4),d2=Math.abs(z-.55*x+4);if(Math.abs(x)<28&&z<1&&z>-22)land=Math.max(land,.22-Math.min(d1,d2)/8);if(Math.abs(x)<5&&z<-12&&z>-39)land=Math.max(land,.24-Math.abs(x)/18);if(land<0)return -1.2;const n=Math.sin(x*.14)*Math.cos(z*.12)+Math.sin(z*.24+x*.1)*.4;return Math.max(0,Math.floor((land*2+n*.6)*1.5))*.6;}
for(let j=0;j<N;j++)for(let i=0;i<N;i++)heights[index(i,j)]=rawHeight((i+.5)*S-half,(j+.5)*S-half);
function ground(x,z){const i=Math.floor((x+half)/S),j=Math.floor((z+half)/S);return i<0||j<0||i>=N||j>=N?-1.2:heights[index(i,j)];}
const batches=new Map();function addBlock(x,y,z,sx,sy,sz,color){if(!batches.has(color))batches.set(color,[]);batches.get(color).push([x,y,z,sx,sy,sz])}
const terrainTriangles=terrainMesh(heights,N,S,random,scene);
const obstacles=[];
const relics=[{x:-28,z:-18,name:'风之遗迹',story:'风从石门中穿过。你听见，岛屿在低声讲述很久以前的故事。',color:'#f4ca7e'},{x:28,z:-20,name:'苔之庭院',story:'苔藓包裹着旧石柱。被遗忘的地方，也在慢慢生长。',color:'#b8e3ab'},{x:0,z:-38,name:'星落神殿',story:'石碑上刻着：只要还有人愿意寻找，光就不会熄灭。',color:'#c6c2fa'}];
const tower={x:0,z:7};
function nearImportant(x,z){return Math.hypot(x,z-21)<5||Math.hypot(x-tower.x,z-tower.z)<6||relics.some(r=>Math.hypot(x-r.x,z-r.z)<9)||Math.hypot(x,z+27.5)<3||Math.hypot(x-15,z-20)<10||[[-9,20],[7,11],[2,25]].some(p=>Math.hypot(x-p[0],z-p[1])<3)||PEOPLE.some(p=>Math.hypot(x-p.x,z-p.z)<3)||RACE_POINTS.some(p=>Math.hypot(x-p[0],z-p[1])<2)||MEMORIES.some(r=>Math.hypot(x-r.x,z-r.z)<3)}
for(let k=0;k<420;k++){const x=Math.floor((random()*100-50)/S)*S+.6,z=Math.floor((random()*100-53)/S)*S+.6,h=ground(x,z);if(h<.6||nearImportant(x,z))continue;const tall=2.6+random()*2;obstacles.push({x,z,r:.55,height:tall+2,cameraRadius:1.7});addBlock(x,h+tall/2,z,.5,tall,.5,'#65563e');const biome=Math.hypot(x+28,z+18)<18?'wind':Math.hypot(x,z+38)<18?'star':'moss';const green=(biome==='wind'?['#8e9450','#a1a15c','#9c9255','#a4a667']:biome==='star'?['#617983','#6d858c','#638582','#7d9292']:['#426b4c','#4a7750','#567e52','#648952'])[Math.floor(random()*4)];addBlock(x,h+.018,z,1.3,.03,1.3,'#5b7653');addBlock(x,h+tall-.3,z,3.3,1.6,3.1,green);addBlock(x-.3,h+tall+.7,z+.1,2.5,1.2,2.5,biome==='wind'?'#b6b56f':biome==='star'?'#8ca4a1':'#73935b');addBlock(x+.1,h+tall+1.4,z,1.6,.6,1.6,biome==='wind'?'#c4be7b':biome==='star'?'#a2b4ad':'#90a76a');}
for(let k=0;k<1000;k++){const x=random()*100-50,z=random()*105-55,h=ground(x,z);if(h<.6||nearImportant(x,z))continue;const flower=random()<.18;addBlock(x,h+.16,z,.08,.32,.08,'#597f4c');if(flower)addBlock(x,h+.35,z,.23,.14,.23,random()<.5?'#f0cc82':'#ddbea6');else addBlock(x+.09,h+.2,z,.2,.09,.12,'#a4b778');}
for(const r of relics){r.y=ground(r.x,r.z);for(const [dx,dz] of [[-3,-2],[3,-2],[-3,2],[3,2]]){const h=r.y;const th=3+random()*2;addBlock(r.x+dx,h+th/2,r.z+dz,.9,th,.9,'#9a9c81');addBlock(r.x+dx,h+th,r.z+dz,1.3,.4,1.3,'#b7b59a');obstacles.push({x:r.x+dx,z:r.z+dz,r:.7});}addBlock(r.x,r.y+.2,r.z,3,.4,3,'#92977d');addBlock(r.x,r.y+.55,r.z,1.3,.5,1.3,'#b1ae8e');addBlock(r.x,r.y+4.5,r.z-2,6.9,.6,1.2,'#9b9f85');const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.58),new THREE.MeshStandardMaterial({color:r.color,emissive:r.color,emissiveIntensity:.7,roughness:.7,flatShading:true}));gem.position.set(r.x,r.y+1.7,r.z);scene.add(gem);r.gem=gem;const light=new THREE.Object3D();light.position.copy(gem.position);scene.add(light);r.light=light;const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1,4),new THREE.MeshBasicMaterial({color:r.color,side:THREE.DoubleSide,transparent:true,opacity:.5}));ring.rotation.x=-Math.PI/2;ring.position.set(r.x,r.y+.86,r.z);scene.add(ring);r.ring=ring;}
const trials = new IslandTrials({scene, ground, block:addBlock, cube, obstacles, progress:saved?.puzzles,
  memories:saved?.memories, audio:islandAudio, toast, changed:()=>{updateQuest();save();}});
const ty=ground(tower.x,tower.z);
for(let level=0;level<7;level++){const s=3.4-level*.26;addBlock(0,ty+.4+level*.8,7,s,.8,s,level%2?'#ded4ae':'#b7b59a');}
for(const dx of [-.9,.9])for(const dz of [-.9,.9])addBlock(dx,ty+6.7,7+dz,.2,1.8,.2,'#716a4d');
addBlock(0,ty+7.7,7,3,.35,3,'#576b54');addBlock(0,ty+8.05,7,2,.35,2,'#6b7e5a');addBlock(0,ty+8.4,7,1,.35,1,'#89956a');
const beacon=new THREE.Mesh(new THREE.OctahedronGeometry(.7),new THREE.MeshBasicMaterial({color:'#f8dc99'}));beacon.position.set(0,ty+6.7,7);scene.add(beacon);beacon.visible=false;
const beam=new THREE.Mesh(new THREE.CylinderGeometry(.5,2,65,8,1,true),new THREE.MeshBasicMaterial({color:'#ffe7a7',transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));beam.position.set(0,ty+35,7);beam.visible=false;scene.add(beam);
// 营地与引导石径。
for(let z=11;z<23;z+=1.5)addBlock((random()-.5)*1.2,ground(0,z)+.05,z,.8,.1,.65,'#b0ac88');
obstacles.push({x:5,z:20,r:1.2});for(const r of relics)obstacles.push({x:r.x,z:r.z,r:1.2});
const campY=ground(5,20);for(let i=0;i<5;i++)addBlock(5,campY+.4+i*.38,20,3-i*.48,.4,2.5,'#d2ae72');
addBlock(5,campY+.5,21.27,1,1,.08,'#514e3a');addBlock(-4,ground(-4,18)+1,18,.16,2,.16,'#746348');addBlock(-4,ground(-4,18)+1.8,18,1.7,.7,.16,'#bbac7c');
const adventures=new Adventures({scene,ground,obstacles,state:saved?.adventure,toast,audio:islandAudio,changed:()=>{updateQuest();save();},showDialog:showCharacterDialog,closeDialog:closeModal});
obstacles.push({x:0,z:7,r:1.7,height:9,cameraRadius:1.9});
const obstacleGrid=new ObstacleGrid(obstacles);
const worldChunks=mergeWorld(batches,scene);
const avatar=new Explorer(scene);avatar.root.scale.setScalar(.85);
const firstHands=mergeBlocks([[-.28,-.38,-.6,.14,.27,.32,'#537f78'],[.28,-.36,-.6,.14,.27,.3,'#537f78'],[.28,-.48,-.69,.15,.19,.15,'#ffe4a0']]);camera.add(firstHands);scene.add(camera);firstHands.visible=false;
const cameraTarget=new THREE.Vector3(),cameraDesired=new THREE.Vector3();let cameraReady=false,motionSpeed=0,motionHeading=0,gliding=false,jumpCount=0,dashTime=0,dashCooldown=0,dashHeading=0,groundLevel=0;
let averageFrame=16.7,adaptiveTimer=0,visualTimer=0;const frameSamples=[];
const water=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshLambertMaterial({color:'#548e83'}));water.rotation.x=-Math.PI/2;water.position.y=-.36;scene.add(water);
const waveData=[];for(let k=0;k<250;k++){const x=random()*125-62,z=random()*125-62;if(ground(x,z)<0)waveData.push([x,z,.5+random()*2]);}
const waves=new THREE.InstancedMesh(box,material('#95b7a0'),waveData.length);waveData.forEach((w,i)=>{dummy.position.set(w[0],-.32,w[1]);dummy.scale.set(w[2],.025,.08);dummy.updateMatrix();waves.setMatrixAt(i,dummy.matrix)});waves.computeBoundingSphere();scene.add(waves);
const clouds=new THREE.InstancedMesh(box,material('#e6e7cd'),80);for(let k=0;k<20;k++){const x=random()*180-90,z=random()*160-80,y=20+random()*10;for(let c=0;c<4;c++){dummy.position.set(x+(c-1.5)*3,y+random()*.8,z+random()*2);dummy.scale.set(4+random()*3,1.2,3+random()*3);dummy.updateMatrix();clouds.setMatrixAt(k*4+c,dummy.matrix)}}clouds.computeBoundingSphere();scene.add(clouds);
const sunMesh=new THREE.Mesh(new THREE.BoxGeometry(7,7,1),new THREE.MeshBasicMaterial({color:'#fff0ba'}));sunMesh.position.set(-52,35,-75);scene.add(sunMesh);
const fireflyData=[];const fireflies=new THREE.InstancedMesh(box,new THREE.MeshBasicMaterial({color:'#e5d891'}),45);for(let k=0;k<45;k++)fireflyData.push([random()*60-30,1+random()*5,random()*60-35]);fireflies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fireflies.frustumCulled=false;scene.add(fireflies);

const player={x:0,z:21,y:ground(0,21)+1.65,yaw:0,pitch:0,vy:0,stamina:1};
let collected=new Set(saved?.collected||[]),visited=new Set(saved?.visited||[]),won=saved?.won||false,elapsed=saved?.elapsed||0;
let started=false,paused=false,locked=false,near=null,quality=settings.quality,soundOn=false,lastSave=0,toastTimer,showMap=true,dragPointer=null,uiTimer=0,exhausted=false,jumpQueued=0;
let previousFocus=null,restoredPosition=false;
if(saved){player.x=saved.player.x;player.z=saved.player.z;player.yaw=saved.player.yaw;player.y=Math.max(ground(player.x,player.z),-.36)+1.65;}
function save(){if(!started)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:3,collected:[...collected],visited:[...visited],memories:[...trials.memories],won,elapsed,adventure:adventures.export(),puzzles:trials.export(),player:{x:player.x,z:player.z,yaw:player.yaw}}));}catch{if(!save.warned){toast('无法保存进度。可在暂停菜单导出旅程备份。');save.warned=true}}}
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({...settings,quality,sound:soundOn}));}catch{}}
function progressData(){return {version:3,collected:[...collected],visited:[...visited],memories:[...trials.memories],won,elapsed,adventure:adventures.export(),puzzles:trials.export(),player:{x:player.x,z:player.z,yaw:player.yaw}};}
function toast(text){if(typeof paused!=='undefined'&&paused&&!$('modal').classList.contains('hidden')){let feedback=$('dialogFeedback');if(!feedback){feedback=document.createElement('p');feedback.id='dialogFeedback';feedback.className='dialog-feedback';$('modalContent').append(feedback);}feedback.textContent=text;}$('toast').textContent=text;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,4200)}
function updateQuest(){relics.forEach((r,i)=>{r.gem.visible=!collected.has(i)&&trials.solved(i);r.ring.visible=!collected.has(i);r.light.visible=!collected.has(i)&&trials.solved(i);r.ring.material.opacity=trials.solved(i)?.7:.2;$('shards').children[i].className=collected.has(i)?'found':'';$('shards').children[i].textContent=collected.has(i)?'◆':'◇'});$('quest-count').textContent=collected.size+' / 3';$('percent').textContent=Math.round((visited.size+collected.size+trials.memories.size+(won?1:0)+adventures.motes.size+Object.values(adventures.state.quests).filter(Boolean).length)/19*100)+'%';$('quest-title').textContent=won?'岛屿，重新有了光':collected.size===3?'最后一步：唤醒灯塔':'让灯塔，再次亮起';$('quest-text').textContent=won?'与朋友完成委托，或继续寻找岸边的旅行记忆':collected.size===3?'回到中央灯塔，按 E 放入晶核':'听风铃、唤苔纹、转星盘，寻回三枚晶核';beacon.visible=won;beam.visible=won;if(won&&trials.memories.size===3&&adventures.motes.size===6&&Object.values(adventures.state.quests).every(Boolean)){$('quest-title').textContent='所有相遇，都有了回响';$('quest-text').textContent='你已点亮灯塔，完成三位朋友的委托与全部探索。';}}
function resize(){let w=Math.ceil(innerWidth/quality),h=Math.ceil(innerHeight/quality);const cap=matchMedia('(pointer:coarse)').matches?480000:1200000;if(w*h>cap){const scale=Math.sqrt(cap/(w*h));w=Math.ceil(w*scale);h=Math.ceil(h*scale);}renderer.setSize(w,h,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
window.addEventListener('resize',resize);resize();updateQuest();
function playTone(freq=440){islandAudio.tone(freq,1.3,.4);}
async function toggleSound(){const next=!soundOn;const ok=await islandAudio.setEnabled(next);if(!ok){toast('浏览器暂时无法开启声音，请再次点击重试');return;}soundOn=next;$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').innerHTML='♫ <span>声音'+(soundOn?'开':'关')+'</span>';saveSettings();}
$('sound').onclick=toggleSound;$('quality').onclick=()=>{settings.autoQuality=false;quality=quality<2?2.6:quality<3.4?3.8:1.3;settings.quality=quality;resize();updateQualityLabel();saveSettings()};$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{toast('当前窗口不支持全屏，可以在浏览器中打开游戏')}};
function updateQualityLabel(){$('quality').innerHTML='▦ <span>'+(settings.autoQuality?'自适应':quality<2?'清晰':quality<3.4?'像素':'轻量')+'</span>';}
function release(){if(document.pointerLockElement)document.exitPointerLock();}
function begin(){started=true;paused=false;document.body.classList.add('playing');$('intro').classList.add('hidden');$('hud').classList.remove('hidden');$('modal').classList.add('hidden');setModalInert(false);if(!restoredPosition){repairPosition();restoredPosition=true;}updateUI();$('world').focus();cameraReady=false;updateCamera(1);toast(saved?'阿苔，欢迎回来。人物委托和机关进度已保留。':'你是旅行者阿苔。米洛和岚在营地等你。V 切视角，二次空格二段跳，F 冲刺，Q 共鸣。');if(settings.sound&&!soundOn)toggleSound();save();}
$('start').onclick=begin;
function setModalInert(value){document.querySelector('header').inert=value;$('hud').inert=value;$('intro').inert=value;}
function openModal(content){previousFocus=document.activeElement;paused=true;jumpQueued=0;keys.clear();dragging=false;dragPointer=null;release();islandAudio.pause(true);$('modalContent').innerHTML=content;$('modal').classList.remove('hidden');setModalInert(true);requestAnimationFrame(()=>{$('modalContent').querySelector('button,input,select')?.focus();});}
function closeModal(){$('modal').classList.add('hidden');paused=false;keys.clear();setModalInert(false);islandAudio.pause(false);if(previousFocus?.isConnected&&!previousFocus.closest('.hidden'))previousFocus.focus();else $('world').focus();}
function pause(){if(!started)return;if(!$('modal').classList.contains('hidden'))return closeModal();save();openModal('<div class="eyebrow">TAKE A LITTLE BREATH · v2.0</div><h2>在风里歇一会儿。</h2><p>旅程已自动保存。你回来时，岛上的时间才会继续。<br>WASD 移动 · 鼠标环顾 · Shift 奔跑 · 空格跳跃<br>V 视角 · Q 共鸣 · F 冲刺 · 空格二段跳/长按滑翔<br>E 互动 · K 委托 · M 地图 · J 手记 · R 返回营地</p><button class="primary" id="resume">继续探索 ↗</button><div class="menu-grid"><button id="settingsBtn">操作与设置</button><button id="photoBtn">保存纪念照</button><button id="exportSave">导出旅程</button><button id="importSave">导入旅程</button></div><button class="secondary" id="restart">重新开始旅程</button><input id="saveFile" type="file" accept="application/json,.json" hidden>');$('resume').onclick=closeModal;$('settingsBtn').onclick=settingsModal;$('photoBtn').onclick=takePhoto;$('exportSave').onclick=()=>download(JSON.stringify(progressData(),null,2),'苔光群岛_旅程备份.json','application/json');$('importSave').onclick=()=>$('saveFile').click();$('saveFile').onchange=importJourney;$('restart').onclick=resetConfirmation;}
function resetConfirmation(){openModal('<div class="eyebrow">NEW JOURNEY</div><h2>重新启程？</h2><p>这会清除当前晶核、机关、记忆与通关记录。设置会保留。你也可以先返回暂停菜单导出备份。</p><button class="primary" id="confirmReset">确认，开始新旅程</button><button class="secondary" id="cancelReset">保留当前旅程</button>');$('cancelReset').onclick=()=>{closeModal();pause()};$('confirmReset').onclick=()=>{collected.clear();visited.clear();trials.reset();adventures.reset();jumpCount=0;dashTime=0;dashCooldown=0;cameraReady=false;won=false;elapsed=0;saved=null;player.x=0;player.z=21;player.y=ground(0,21)+1.65;player.yaw=0;player.pitch=0;player.vy=0;player.stamina=1;exhausted=false;updateQuest();save();closeModal();updateUI();toast('新的一天，新的旅程。')}};
$('pauseBtn').onclick=pause;$('closeModal').onclick=closeModal;
function showHint(id){openModal('<div class="eyebrow">ISLAND INSCRIPTIONS / 遗迹石碑</div><h2>'+relics[id].name+'</h2><p>'+TRIAL_HINTS[id]+'</p><div class="journal-row">'+trialStatus(id)+'</div><button class="primary" id="backToIsland">我知道下一步了 ↗</button>');$('backToIsland').onclick=closeModal;}
function trialStatus(i){return i===0?'风铃回应：'+trials.wind.map(n=>['低','中','高'][n]).join(' → ')+(trials.solved(0)?' · 已完成':' · '+trials.wind.length+'/3'):i===1?'苔纹苏醒：'+trials.moss.size+'/3':'星盘朝向：'+trials.stars.map(n=>['北','东','南','西'][n]).join(' · ')+(trials.solved(2)?' · 已完成':'');}
function journal(){if(!started)return;openModal('<div class="eyebrow">FIELD NOTES / 旅行手记</div><h2>光曾到过这里。</h2><p>地图上的 ◆ 是遗迹，✦ 是灯塔。先读遗迹前的石碑，观察机关，再寻找中央苏醒的晶核。</p>'+relics.map((r,i)=>'<div class="journal-row"><b>'+(collected.has(i)?'◆':visited.has(i)?'◇':'？')+' '+(visited.has(i)?r.name:['西北 · 风穿过的石门','东北 · 苔藓环绕的庭院','正北 · 星星坠落的地方'][i])+'</b><br>'+(visited.has(i)?r.story:'尚未抵达，跟着地图与路标去看看。')+'<br><small>'+(collected.has(i)?'晶核已收集':Math.round(Math.hypot(player.x-r.x,player.z-r.z))+' 米')+'</small>'+(visited.has(i)?'<p>'+TRIAL_HINTS[i]+'</p><small>'+trialStatus(i)+'</small>':'')+'</div>').join('')+'<div class="eyebrow">OPTIONAL / 岸边的旅行记忆 '+trials.memories.size+'/3</div>'+MEMORIES.map((m,i)=>'<div class="journal-row"><b>'+(trials.memories.has(i)?'▤ '+m.name:'？ '+['营地西侧的岸边','庭院东侧的海湾','神殿西侧的石椅'][i])+'</b><br>'+(trials.memories.has(i)?m.text:'可以先完成灯塔旅程，再慢慢寻找。')+'</div>').join('')+'<p>浅海可游泳。按 R 返回营地，或按 P 保存此刻的风景。</p>');}
$('journalBtn').onclick=journal;$('journalSlot').onclick=journal;function toggleMap(){showMap=!showMap;document.querySelector('.map-panel').classList.toggle('hidden',!showMap)}$('mapSlot').onclick=toggleMap;
function home(){if(!started||paused)return;player.x=0;player.z=21;player.y=ground(0,21)+1.65;player.vy=0;player.yaw=0;player.pitch=0;jumpCount=0;dashTime=0;cameraReady=false;adventures.cancelRace();save();toast('回到苔风营地。米洛和岚就在前方。')}$('homeSlot').onclick=home;
function interact(){if(!started||paused)return;updateUI();if(!near)return;if(['person','seed'].includes(near.type)){adventures.interact(near);updateUI();return;}if(!['relic','tower','locked'].includes(near.type)){trials.interact(near,showHint);updateUI();return;}if(near.type==='locked'){showHint(near.id);return;}if(near.type==='relic'){const i=near.id;collected.add(i);visited.add(i);updateQuest();islandAudio.success();save();toast('获得'+relics[i].name+'晶核 · '+collected.size+'/3'+(collected.size===3?'，回中央灯塔点亮它！':''));$('hud').classList.remove('collected-flash');requestAnimationFrame(()=>$('hud').classList.add('collected-flash'));}else if(collected.size<3)toast('灯塔在等待 '+(3-collected.size)+' 枚晶核。三处遗迹前的石碑藏着线索。');else if(!won){won=true;updateQuest();save();islandAudio.success();openModal('<div class="eyebrow">JOURNEY COMPLETE / 旅程完成</div><h2>你把光带回来了。</h2><p>三枚晶核在灯塔里汇成一道光。<br>海风依旧温柔，而这片岛屿记住了你的脚步。</p><div class="journal-row">◆ 晶核收集　3 / 3<br>◈ 遗迹探访　3 / 3<br>▤ 旅行记忆　'+trials.memories.size+' / 3<br>☷ 同行委托　'+Object.values(adventures.state.quests).filter(Boolean).length+' / 3<br>◷ 旅行时间　'+Math.floor(elapsed/60)+' 分 '+Math.floor(elapsed%60)+' 秒</div><button class="primary" id="wander">继续漫游，完成朋友的委托 ↗</button><button class="secondary" id="finishPhoto">留下这次旅程的纪念照</button>');$('wander').onclick=closeModal;$('finishPhoto').onclick=()=>{closeModal();takePhoto()};}else toast('灯塔的光会一直亮着。放心去远方吧。');}
const keys=new Set();window.addEventListener('keydown',e=>{if(e.code==='Tab'&&!$('modal').classList.contains('hidden')){const list=[...$('modal').querySelectorAll('button:not([disabled]),input:not([hidden]),select,a[href]')].filter(x=>x.offsetParent!==null);if(list.length){const first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}return;}if(e.code==='Escape'){e.preventDefault();if(!e.repeat)pause();return;}if(paused||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)&&['Space','Enter'].includes(e.code))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='KeyJ'){journal();return;}if(e.code==='KeyP'){takePhoto();return;}if(started&&e.code==='KeyV'){toggleView();return;}if(started&&e.code==='KeyQ'){adventures.toggleEcho();return;}if(started&&e.code==='KeyF'){startDash();return;}if(started&&e.code==='KeyK'){tasksModal();return;}if(started&&e.code==='KeyT'){adventures.cancelRace();return;}if(e.code==='KeyM'&&started)toggleMap();if(e.code==='KeyR')home();if(e.code==='KeyE')interact();if(started&&!paused){if(e.code==='Space')jumpQueued=.18;keys.add(e.code)}});window.addEventListener('keyup',e=>keys.delete(e.code));
function download(data, name, type) {
  const blob = data instanceof Blob ? data : new Blob([data], {type});
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function settingsModal() {
  openModal('<div class="eyebrow">MAKE YOURSELF AT HOME / 设置</div><h2>按你的步调。</h2><label class="setting-row">环顾灵敏度 <input id="sensitivity" type="range" min="0.35" max="2" step="0.05" value="'+settings.sensitivity+'"><output id="sensitivityValue">'+settings.sensitivity.toFixed(2)+'</output></label><label class="setting-row">视野范围 <input id="fov" type="range" min="55" max="90" step="1" value="'+settings.fov+'"><output id="fovValue">'+settings.fov+'°</output></label><label class="setting-row">环境音量 <input id="volume" type="range" min="0" max="1" step="0.05" value="'+settings.volume+'"><output id="volumeValue">'+Math.round(settings.volume*100)+'%</output></label><label class="setting-row">观察视角 <select id="cameraView"><option value="third">第三人称跟随</option><option value="first">第一人称</option></select></label><label class="setting-row">画面精度 <select id="renderQuality"><option value="auto">自适应 · 优先流畅</option><option value="2.6">像素 · 推荐</option><option value="1.3">清晰 · 更多细节</option><option value="3.8">轻量 · 更少开销</option></select></label><label class="setting-row">行走轻微晃动 <input id="motion" type="checkbox" '+(settings.motion?'checked':'')+'></label><p>可以拖动画面环顾，无需锁定鼠标。<br>触屏：左侧方向键移动，拖动画面环顾，右侧跳跃与互动。<br>容易晕动时，可关闭行走晃动并调高视野范围。</p><button class="primary" id="settingsBack">保存设置，继续旅程 ↗</button>');
  $('renderQuality').value = settings.autoQuality?'auto':String(settings.quality);$('cameraView').value=settings.viewMode;$('cameraView').onchange=e=>{settings.viewMode=e.target.value;cameraReady=false;saveSettings();};
  $('sensitivity').oninput = e => {settings.sensitivity=Number(e.target.value);$('sensitivityValue').textContent=settings.sensitivity.toFixed(2);saveSettings();};
  $('fov').oninput = e => {settings.fov=Number(e.target.value);camera.fov=settings.fov;camera.updateProjectionMatrix();$('fovValue').textContent=settings.fov+'°';saveSettings();};
  $('volume').oninput = e => {settings.volume=Number(e.target.value);islandAudio.setVolume(settings.volume);$('volumeValue').textContent=Math.round(settings.volume*100)+'%';saveSettings();};
  $('renderQuality').onchange=e=>{settings.autoQuality=e.target.value==='auto';if(!settings.autoQuality){quality=Number(e.target.value);settings.quality=quality;}else quality=settings.quality;resize();updateQualityLabel();saveSettings();};
  $('motion').onchange = e => {settings.motion=e.target.checked;saveSettings();};
  $('settingsBack').onclick = closeModal;
}
async function importJourney(e) {
  const file=e.target.files?.[0]; if(!file)return;
  try {
    if(file.size>65536)throw Error('备份文件过大');
    const next=parseProgress(JSON.parse(await file.text())); if(!next)throw Error('无法识别的旅程备份');
    openModal('<div class="eyebrow">RESTORE JOURNEY / 恢复旅程</div><h2>回到这段旅程？</h2><p>备份内包含 '+next.collected.length+' 枚晶核、'+next.memories.length+' 段记忆与机关进度。确认后会替换当前旅程。</p><button class="primary" id="confirmImport">确认，恢复此旅程</button><button class="secondary" id="cancelImport">保留当前旅程</button>');
    $('cancelImport').onclick=()=>{closeModal();pause();};
    $('confirmImport').onclick=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(next));started=false;location.reload();}catch{toast('当前浏览器禁止写入存档，旅程未替换');closeModal();}};
  } catch { openModal('<div class="eyebrow">RESTORE JOURNEY</div><h2>这份备份无法读取。</h2><p>请选用本游戏导出的 JSON 旅程备份（不超过 64 KB）。当前旅程已保留。</p><button class="primary" id="importBack">返回岛上 ↗</button>');$('importBack').onclick=closeModal; }
}
function takePhoto() {
  if(!started)return;
  renderer.render(scene,camera);
  const canvas=document.createElement('canvas'), scale=Math.min(1080/renderer.domElement.width,2.6);
  canvas.width=Math.round(renderer.domElement.width*scale)+48;canvas.height=Math.round(renderer.domElement.height*scale)+120;
  const c=canvas.getContext('2d');c.fillStyle='#eeead7';c.fillRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  c.drawImage(renderer.domElement,24,24,canvas.width-48,canvas.height-120);
  c.fillStyle='#365245';c.font='20px Microsoft YaHei';c.fillText('苔光群岛 · '+$('region').textContent,26,canvas.height-52);
  c.font='11px monospace';c.fillStyle='#8a815c';c.fillText('MOSSLIGHT ISLANDS  /  DAY '+(Math.floor(elapsed/480)+1)+'  /  '+collected.size+' OF 3 LIGHTS',26,canvas.height-27);
  const data=canvas.toDataURL('image/png');
  openModal('<div class="eyebrow">A MOMENT TO KEEP / 风景明信片</div><h2>把风景带回家。</h2><img id="photoPreview" alt="当前岛屿风景明信片"><button class="primary" id="savePhoto">下载纪念照 PNG ↗</button><button class="secondary" id="photoBack">回到岛上</button>');
  $('photoPreview').src=data;$('photoBack').onclick=closeModal;$('savePhoto').onclick=()=>{const a=document.createElement('a');a.href=data;a.download='苔光群岛_旅行明信片.png';a.click();};
}
window.addEventListener('blur',()=>{keys.clear();if(started&&!paused)pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden){save();keys.clear();if(started&&!paused)pause()}});window.addEventListener('pagehide',save);
document.addEventListener('pointerlockchange',()=>{const previous=locked;locked=document.pointerLockElement===$('world');if(previous&&!locked&&started&&!paused)pause()});
let dragging=false,lastX=0,lastY=0,moved=false;
$('world').addEventListener('pointerdown',e=>{if(!started||paused||dragPointer!==null)return;dragPointer=e.pointerId;dragging=true;moved=false;lastX=e.clientX;lastY=e.clientY;try{$('world').setPointerCapture(e.pointerId)}catch{}});
$('world').addEventListener('pointerup',e=>{if(e.pointerId!==dragPointer)return;dragPointer=null;dragging=false;if(!started||paused||moved||e.pointerType==='touch')return;try{const req=$('world').requestPointerLock();if(req?.catch)req.catch(()=>toast('拖动画面也可以环顾四周'))}catch{toast('拖动画面环顾四周')}});
$('world').addEventListener('pointercancel',()=>{dragPointer=null;dragging=false});
document.addEventListener('pointermove',e=>{if(!started||paused)return;let dx=0,dy=0;if(locked){dx=e.movementX;dy=e.movementY}else if(dragging&&e.pointerId===dragPointer){dx=e.clientX-lastX;dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;if(Math.abs(dx)+Math.abs(dy)>1)moved=true;}else return;player.yaw-=dx*.003*settings.sensitivity;player.pitch=clamp(player.pitch-dy*.003*settings.sensitivity,-1.25,1.25)});
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();if(!paused){keys.add(b.dataset.key);if(b.dataset.key==='Space')jumpQueued=.18;}b.setPointerCapture(e.pointerId)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(b.dataset.key))});$('touchUse').onclick=interact;
function canMove(x,z){if(Math.abs(x)>59||Math.abs(z)>59)return false;if(ground(x,z)>player.y-1.65+.75)return false;return !obstacleGrid.blocked(x,z);}
function repairPosition(){if(canMove(player.x,player.z))return;for(let r=.5;r<=8;r+=.5)for(let a=0;a<16;a++){const x=player.x+Math.sin(a*Math.PI/8)*r,z=player.z+Math.cos(a*Math.PI/8)*r;if(canMove(x,z)){player.x=x;player.z=z;player.y=Math.max(ground(x,z),-.36)+1.65;return}}player.x=0;player.z=21;player.y=ground(0,21)+1.65;}
function move(dt){
  const f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  const length=Math.hypot(f,side),moving=length>0,swimming=ground(player.x,player.z)<-.4;
  if(player.stamina<=.02)exhausted=true;if(player.stamina>.2)exhausted=false;
  const running=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&moving&&!exhausted&&!swimming;
  let speed=swimming?2.5:running?7:4.6;
  let dx=(-Math.sin(player.yaw)*f+Math.cos(player.yaw)*side)/(length||1),dz=(-Math.cos(player.yaw)*f-Math.sin(player.yaw)*side)/(length||1);
  dashCooldown=Math.max(0,dashCooldown-dt);dashTime=Math.max(0,dashTime-dt);
  if(dashTime>0){dx=-Math.sin(dashHeading);dz=-Math.cos(dashHeading);speed=16;}
  const oldX=player.x,oldZ=player.z,oldFeet=player.y-1.65;
  if(canMove(player.x+dx*speed*dt,player.z))player.x+=dx*speed*dt;
  if(canMove(player.x,player.z+dz*speed*dt))player.z+=dz*speed*dt;
  const terrainFloor=Math.max(ground(player.x,player.z),-.36);
  const support=adventures.standingSurface(player.x,player.z,oldFeet);
  let floor=Math.max(terrainFloor,support),onGround=player.y<=floor+1.69;
  if(onGround&&player.vy<=0){jumpCount=0;player.y=floor+1.65;player.vy=0;}
  if(jumpQueued>0&&jumpCount<2){player.vy=jumpCount===0?5.8:5.5;jumpCount++;jumpQueued=0;islandAudio.tone(jumpCount===1?220:330,.12,.1);}
  jumpQueued=Math.max(0,jumpQueued-dt);
  gliding=keys.has('Space')&&jumpCount>0&&player.vy<-.1&&player.stamina>.03;
  if(gliding){player.vy=Math.max(player.vy,-1.15);player.vy-=2.5*dt;player.stamina=Math.max(0,player.stamina-dt*.13);}else player.vy-=16*dt;
  if(running)player.stamina=Math.max(0,player.stamina-dt*.13);else if(!gliding)player.stamina=Math.min(1,player.stamina+dt*.14);
  player.y+=player.vy*dt;
  const platform=adventures.surface(player.x,player.z,oldFeet,player.y-1.65,player.vy);floor=Math.max(terrainFloor,platform);
  if(player.y<=floor+1.65){player.y=floor+1.65;player.vy=0;jumpCount=0;gliding=false;}
  groundLevel=Math.max(terrainFloor,adventures.standingSurface(player.x,player.z,player.y-1.65));
  const travelled=Math.hypot(player.x-oldX,player.z-oldZ);motionSpeed=travelled/dt;if(travelled>.001)motionHeading=Math.atan2(-(player.x-oldX),-(player.z-oldZ));
  if(travelled>.001&&jumpCount===0)islandAudio.step(swimming,elapsed);
}
function startDash(){if(!started||paused||dashCooldown>0)return;dashTime=.22;dashCooldown=1.65;dashHeading=motionSpeed>.2?motionHeading:player.yaw;islandAudio.tone(180,.16,.12);}
function toggleView(){if(!started||paused)return;settings.viewMode=settings.viewMode==='third'?'first':'third';cameraReady=false;saveSettings();toast(settings.viewMode==='third'?'第三人称 · 阿苔和萤仔一起出发':'第一人称 · 从阿苔的眼睛看群岛');}
function updateCamera(dt){
  const first=settings.viewMode==='first';firstHands.visible=first;
  if(first){camera.position.set(player.x,player.y,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');cameraReady=false;return;}
  cameraTarget.set(player.x,player.y-.6,player.z);
  const distance=9,cp=Math.cos(player.pitch);cameraDesired.set(cameraTarget.x+Math.sin(player.yaw)*distance*cp,cameraTarget.y+1.25-Math.sin(player.pitch)*distance,cameraTarget.z+Math.cos(player.yaw)*distance*cp);
  for(let t=.18;t<=1;t+=.08){const x=cameraTarget.x+(cameraDesired.x-cameraTarget.x)*t,y=cameraTarget.y+(cameraDesired.y-cameraTarget.y)*t,z=cameraTarget.z+(cameraDesired.z-cameraTarget.z)*t;if(obstacleGrid.cameraBlocked(x,y,z,ground)){cameraDesired.set(cameraTarget.x+(cameraDesired.x-cameraTarget.x)*Math.max(.18,t-.1),cameraTarget.y+(cameraDesired.y-cameraTarget.y)*Math.max(.18,t-.1),cameraTarget.z+(cameraDesired.z-cameraTarget.z)*Math.max(.18,t-.1));break;}}
  if(!cameraReady){camera.position.copy(cameraDesired);cameraReady=true;}else camera.position.lerp(cameraDesired,1-Math.exp(-dt*14));camera.lookAt(cameraTarget);
}
const mapCtx=$('map').getContext('2d');const mapBase=document.createElement('canvas');mapBase.width=N;mapBase.height=N;const mc=mapBase.getContext('2d');for(let j=0;j<N;j++)for(let i=0;i<N;i++){const h=heights[index(i,j)];mc.fillStyle=h<0?'#3f716b':h===0?'#b4b17d':h<1.8?'#8fa16b':'#b0ba85';mc.fillRect(i,j,1,1)}
function mapPos(x,z){return [(x+half)/(half*2)*176,(z+half)/(half*2)*176]}
function drawMap(){const c=mapCtx;c.clearRect(0,0,176,176);c.drawImage(mapBase,0,0,176,176);c.strokeStyle='#eadca522';for(let n=0;n<176;n+=22){c.beginPath();c.moveTo(n,0);c.lineTo(n,176);c.moveTo(0,n);c.lineTo(176,n);c.stroke()}for(let i=0;i<3;i++){const [x,y]=mapPos(relics[i].x,relics[i].z);c.fillStyle=collected.has(i)?'#243d30':'#ffe1a0';c.font='13px serif';c.textAlign='center';c.fillText(collected.has(i)?'·':'◆',x,y+4)}for(const p of adventures.people){const xy=mapPos(p.x,p.z);c.fillStyle='#f6e9c3';c.font='8px sans-serif';c.fillText('●',xy[0],xy[1]+3);}for(let i=0;i<adventures.seeds.length;i++){if(adventures.motes.has(i))continue;const s=adventures.seeds[i];if(s.echo&&!adventures.echo)continue;const xy=mapPos(s.x,s.z);c.fillStyle=s.echo?'#a8e0db':'#f9d985';c.fillRect(xy[0]-1,xy[1]-1,3,3);}const [tx,ty]=mapPos(0,7);c.fillStyle='#fff0c8';c.fillText('✦',tx,ty+4);const [x,y]=mapPos(player.x,player.z);c.save();c.translate(x,y);c.rotate(-player.yaw);c.fillStyle='#fffbea';c.strokeStyle='#24483c';c.lineWidth=1;c.beginPath();c.moveTo(0,-6);c.lineTo(-4,4);c.lineTo(0,2);c.lineTo(4,4);c.closePath();c.fill();c.stroke();c.restore();c.fillStyle='#f8e3ae';c.font='9px monospace';c.fillText('N',88,11)}
function updateUI(){near=null;let closest=Infinity;for(let i=0;i<3;i++){const r=relics[i],d=Math.hypot(player.x-r.x,player.z-r.z);if(d<10&&!visited.has(i)){visited.add(i);toast('发现 · '+r.name+'。先读石碑，观察这里的机关。');updateQuest();save()}if(d<2.6&&!collected.has(i)&&d<closest){near={type:trials.solved(i)?'relic':'locked',id:i};closest=d}}
const mechanism=trials.nearest(player);if(mechanism&&Math.hypot(player.x-mechanism.x,player.z-mechanism.z)<closest)near=mechanism;const social=adventures.nearest(player);if(social&&(!near||Math.hypot(player.x-social.x,player.z-social.z)<Math.hypot(player.x-(near.x??relics[near.id]?.x??0),player.z-(near.z??relics[near.id]?.z??7))))near=social;if(Math.hypot(player.x,player.z-7)<4.5&&!social)near={type:'tower'};const plate=trials.nodes.find(n=>n.type==='plate'&&!trials.moss.has(n.id)&&Math.hypot(player.x-n.x,player.z-n.z)<1.3);$('interaction').classList.toggle('hidden',!near&&!plate);$('interaction').querySelector('kbd').textContent=plate&&!near?'停留':'E';$('interaction').querySelector('span').textContent=near?(near.label||near.name||({relic:'拾取苏醒的晶核',locked:'晶核仍在沉睡 · 查看石碑线索',tower:won?'触摸灯塔':collected.size===3?'放入晶核，唤醒灯塔':'查看灯塔'})[near.type]):plate?'让苔纹苏醒 · '+Math.round(trials.charge*100)+'%':'';let rname=ground(player.x,player.z)<0?'浅海 · 向群岛游去':'苔风原野';for(const r of relics)if(Math.hypot(player.x-r.x,player.z-r.z)<13)rname=r.name;if(Math.hypot(player.x,player.z-7)<7)rname='守光灯塔';if(Math.hypot(player.x,player.z-21)<6)rname='苔风营地';$('region').textContent=rname;$('coords').textContent=(player.x<0?'W':'E')+' '+Math.abs(player.x).toFixed(0).padStart(2,'0')+' / '+(player.z<0?'N':'S')+' '+Math.abs(player.z).toFixed(0).padStart(2,'0');const deg=((player.yaw*180/Math.PI)%360+360)%360;$('heading').textContent=['北 N','西 W','南 S','东 E'][Math.round(deg/90)%4];$('day').textContent=Math.floor(elapsed/480)+1;updateAdventureHud();adventures.updateLabels(player,camera);drawMap();}

let last=performance.now(),frame=0;const skyDay=new THREE.Color('#bed5c1'),skyNight=new THREE.Color('#425b70');
function animate(now){
  requestAnimationFrame(animate);const rawDt=Math.min((now-last)/1000,.2),dt=Math.min(rawDt,.1);last=now;
  if(rawDt>0&&document.visibilityState==='visible'){averageFrame=averageFrame*.94+rawDt*1000*.06;if(frameSamples.length<900)frameSamples.push(rawDt*1000);}
  if(!paused){if(started){elapsed+=dt;let remaining=dt;while(remaining>.00001){const step=Math.min(remaining,1/60);move(step);trials.tick(player,step,elapsed);adventures.tick(player,step,elapsed);remaining-=step;}
    updateCamera(dt);avatar.update(player,dt,{speed:motionSpeed,heading:motionHeading,gliding,first:settings.viewMode==='first',floor:groundLevel,dashing:dashTime>0});
    if(now-lastSave>7000){save();lastSave=now;}uiTimer+=dt;if(uiTimer>.12){uiTimer=0;updateUI();}
  }else{const t=now*.000025;camera.position.set(30+Math.sin(t)*2,15,34+Math.cos(t)*2);camera.lookAt(-5,2,-12);trials.tick(player,0,now*.001);avatar.update(player,dt,{floor:ground(player.x,player.z)});}
    const phase=elapsed/480*Math.PI*2,daylight=(Math.cos(phase)+1)/2;scene.background.copy(skyNight).lerp(skyDay,.25+.75*daylight);if(adventures.echo)scene.background.lerp(new THREE.Color('#749cab'),.45);scene.fog.color.copy(scene.background);hemi.intensity=1.15+daylight*.9;sun.intensity=.5+daylight*2;
    for(let i=0;i<3;i++){const r=relics[i];r.gem.rotation.y+=dt*.8;r.gem.position.y=r.y+1.7+Math.sin(now*.0018+i)*.15;r.ring.rotation.z+=dt*.2;}
    clouds.position.x=Math.sin(now*.00001)*12;water.position.y=-.36+Math.sin(now*.0007)*.035;waves.position.y=Math.sin(now*.001)*.025;
    visualTimer+=dt;if(visualTimer>.05){fireflyData.forEach((p,i)=>{dummy.position.set(p[0]+Math.sin(now*.0007+i)*.35,p[1]+Math.sin(now*.001+i)*.25,p[2]);dummy.scale.setScalar(daylight<.65||i%3===0?.06:0);dummy.updateMatrix();fireflies.setMatrixAt(i,dummy.matrix)});fireflies.instanceMatrix.needsUpdate=true;adventures.visual(player,visualTimer,elapsed,camera);visualTimer=0;}
    beacon.rotation.y+=dt;beam.rotation.y+=dt*.1;
    if(settings.autoQuality&&started){adaptiveTimer+=dt;if(adaptiveTimer>2.5){adaptiveTimer=0;const next=averageFrame>25?Math.min(4.8,quality+.4):averageFrame<18?Math.max(settings.quality,quality-.2):quality;if(next!==quality){quality=next;resize();}}}
  }
  frame++;if(!paused||frame%12===0)renderer.render(scene,camera);
}
window.gameReady=true;$('loading').classList.add('hidden');$('intro').classList.remove('hidden');if(saved)$('start').innerHTML='继续未完的旅程 <span>↗</span>';drawMap();requestAnimationFrame(animate);
// 提供只读诊断，便于验证世界生成和进度恢复。
window.mosslight={getState:()=>({started,paused,collected:[...collected],visited:[...visited],memories:[...trials.memories],puzzles:trials.export(),won,elapsed,player:{...player},instances:[...batches.values()].reduce((s,b)=>s+b.length,0),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,terrainTriangles,worldChunks,viewMode:settings.viewMode,avatarVisible:avatar.root.visible,gliding,jumpCount,dashCooldown,echo:adventures.echo,energy:adventures.energy,adventure:adventures.export(),race:adventures.race?{...adventures.race}:null,averageFrame,quality,settings:{...settings,sound:soundOn}}),ground,getNavigation:()=>({obstacles:obstacles.map(o=>({...o})),nodes:[...trials.nodes.map(({type,id,x,z})=>({type,id,x,z})),...adventures.people.map(p=>({type:'person',id:p.id,x:p.x,z:p.z})),...adventures.seeds.map((p,id)=>({type:'seed',id,x:p.x,z:p.z,y:p.y,top:p.top}))],platforms:adventures.platforms.map(p=>({...p})),step:.6,bounds:59})};

function showCharacterDialog(title,text,actions){
  openModal('<div class="eyebrow">FELLOW TRAVELERS / 群岛上的人</div><h2>'+title+'</h2><p class="dialog-copy">'+text+'</p><div id="dialogActions"></div><button class="primary" id="dialogBack">回到岛上 ↗</button>');
  const container=$('dialogActions');for(const action of actions){const button=document.createElement('button');button.className='dialog-action';button.textContent=action.label;button.onclick=action.action;container.append(button);}$('dialogBack').onclick=closeModal;
}
function tasksModal(){if(!started)return;const q=adventures.state.quests;
  openModal('<div class="eyebrow">FELLOW TRAVELERS / 同行委托</div><h2>岛屿，因为相遇而不同。</h2><div class="journal-row"><b>'+(q.delivery?'✓':'○')+' 米洛 · 灯盏里的萤种</b><p>在营地西岸、东侧石径、南边浅滩找三颗萤种，带回给米洛。</p>进度 '+[0,1,2].filter(i=>adventures.motes.has(i)).length+'/3 · 奖励：归航徽章</div><div class="journal-row"><b>'+(q.echo?'✓':'○')+' 岚 · 空中的回响</b><p>按 Q 显露海湾踏桥，用二段跳和滑翔到达高处，带回三枚碎片。</p>进度 '+[3,4,5].filter(i=>adventures.motes.has(i)).length+'/3 · 奖励：萤仔星光形态</div><div class="journal-row"><b>'+(q.race?'✓':'○')+' 小禾 · 风行试炼</b><p>找西北方向的小禾交谈，在 65 秒内依次穿过六道风环。高环需要跳跃。T 取消挑战。</p>'+(adventures.state.raceBest?'最好成绩 '+adventures.state.raceBest.toFixed(1)+' 秒':'奖励：信使徽章与可重复挑战的计时记录')+'</div><p>委托进度、三种遗迹和旅行记忆都会保存。主线完成后仍可继续。</p><button class="primary" id="tasksBack">继续出发 ↗</button>');$('tasksBack').onclick=closeModal;
}
function updateAdventureHud(){
  $('viewName').textContent=settings.viewMode==='third'?'第三人称跟随':'第一人称';$('echoName').textContent=adventures.echo?'回响显现':'现世';$('echoMeter').style.width=(adventures.energy*100)+'%';
  $('dashState').textContent=dashCooldown>0?dashCooldown.toFixed(1)+'s':'就绪';$('taskSummary').textContent=adventures.taskText();$('stamina').style.width=player.stamina*100+'%';$('stamina').parentElement.setAttribute('aria-valuenow',Math.round(player.stamina*100));
  $('raceStatus').classList.toggle('hidden',!adventures.race);if(adventures.race)$('raceStatus').textContent='风行试炼 '+adventures.race.index+'/6 · '+adventures.race.time.toFixed(1)+'s / 65s';
  avatar.deliveryBadge.visible=adventures.state.quests.delivery;avatar.raceBadge.visible=adventures.state.quests.race;document.body.classList.toggle('echoing',adventures.echo);$('actionState').textContent=gliding?'滑翔中 · 松开空格收翼':dashTime>0?'疾风冲刺':jumpCount===2?'二段跳':'阿苔 · 同行伙伴 萤仔';
}
$('viewSlot').onclick=toggleView;$('echoSlot').onclick=()=>{if(!paused&&started)adventures.toggleEcho()};$('dashSlot').onclick=startDash;$('mapSlot').onclick=tasksModal;$('taskTrack').onclick=tasksModal;
$('touchView').onclick=toggleView;$('touchEcho').onclick=()=>{if(!paused&&started)adventures.toggleEcho()};$('touchDash').onclick=startDash;
