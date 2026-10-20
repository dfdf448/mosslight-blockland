import * as THREE from './vendor/three.module.js';

export const MEMORIES = [
  { x: -14, z: 19, name: '留在岸边的船', text: '船底已经长满青苔。有人在木板上刻下：不必赶路，海会替你记住时间。' },
  { x: 37, z: -13, name: '一封没有寄出的信', text: '“如果你回来时灯塔还暗着，就去听风铃，看苔纹，再抬头看看星星。”落款被海水洗去了。' },
  { x: -10, z: -43, name: '守光人的最后一页', text: '“我把光藏在了岛上。若有人愿意慢慢寻找，这便不是故事的结尾。”' }
];
export const TRIAL_HINTS = [
  '石碑写着：风从低处起，越过最高的枝头，最后回到中间。依次敲响「低 → 高 → 中」三座风铃。',
  '石碑写着：别急着离开，停留也是一种照料。在三块苔纹踏石上各停留一秒，让水重新流进庭院。',
  '石碑写着：左迎日出，中望灯塔，右送夕阳。三枚星盘从左到右应指向「东 → 南 → 西」。' 
];

export class IslandTrials {
  constructor({ scene, ground, block, cube, obstacles, progress, memories, changed, toast, audio }) {
    Object.assign(this, { scene, ground, block, cube, obstacles, changed, toast, audio });
    this.wind = [...(progress?.wind || [])]; this.moss = new Set(progress?.moss || []); this.stars = [...(progress?.stars || [0, 0, 0])];
    this.memories = new Set(memories || []); this.nodes = []; this.animations = []; this.charge = 0; this.activePlate = -1;
    const node = (type, id, x, z, name) => { const n = { type, id, x, z, name, y: ground(x, z) }; this.nodes.push(n); return n; };
    const indicator = (n, color) => { n.indicator = cube(n.x, n.y + .16, n.z, .65, .12, .65, color); n.indicator.material = n.indicator.material.clone(); };

    // 风之遗迹：以风铃的高低与声音作为可观察线索。
    for (let i = 0; i < 3; i++) {
      const n = node('bell', i, -28 + (i - 1) * 4.7, -14, ['低音风铃', '中音风铃', '高音风铃'][i]);
      const h = 2.2 + i * .7;
      for (const dx of [-.7, .7]) block(n.x + dx, n.y + h / 2, n.z, .16, h, .16, '#8a754b');
      block(n.x, n.y + h, n.z, 1.8, .23, .3, '#c6ad72');
      n.bell = cube(n.x, n.y + h - .5, n.z, .45, .65, .45, '#d8ba70');
      indicator(n, '#6b7960'); this.animations.push({ type: 'bell', object: n.bell, x: n.x });
      obstacles.push({ x: n.x, z: n.z, r: .35 });
    }
    const mill = new THREE.Group(); mill.position.set(-35, ground(-35, -20) + 5, -20); scene.add(mill);
    cube(0, 0, 0, 5.5, .22, .18, '#dbc58a', mill); cube(0, 0, 0, .22, 5.5, .18, '#dbc58a', mill);
    cube(0, 0, .16, .55, .55, .4, '#a48e61', mill); this.animations.push({ type: 'mill', object: mill });
    block(-35, ground(-35, -20) + 2.4, -20, .5, 4.8, .5, '#7e795c');

    // 苔之庭院：走近踏石并停留，水脉会逐一亮起。
    [[23, -18], [28, -14.5], [33, -18]].forEach(([x, z], i) => {
      const n = node('plate', i, x, z, `苔纹踏石 ${i + 1}`); block(x, n.y + .025, z, 1.8, .05, 1.8, '#6b8973');
      indicator(n, '#6c9182');
      for (const dx of [-.65, .65]) block(x + dx, n.y + .08, z, .08, .08, 1.3, '#c4d6a0');
      for (let t = 0; t < 5; t++) { const f = t / 5; block(x + (28 - x) * f, ground(x + (28 - x) * f, z + (-20 - z) * f) + .04, z + (-20 - z) * f, .25, .08, .25, '#7da69a'); }
    });
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, x = 28 + Math.cos(a) * 7, z = -20 + Math.sin(a) * 7; block(x, ground(x, z) + .25, z, .8, .5, .8, '#7a9d7b'); if (i % 2 === 0) block(x, ground(x, z) + .6, z, .4, .2, .4, '#d2bdcf'); }

    // 星落神殿：三个有方位箭头的古老星盘。
    for (let i = 0; i < 3; i++) {
      const n = node('disc', i, (i - 1) * 4.5, -33.5, ['左星盘', '中星盘', '右星盘'][i]);
      block(n.x, n.y + .6, n.z, 1.3, 1.2, 1.3, '#7d8295');
      const g = n.arrow = new THREE.Group(); g.position.set(n.x, n.y + 1.4, n.z); scene.add(g);
      cube(0, 0, 0, .12, .12, 1.15, '#e4d49f', g); cube(-.19, 0, -.36, .45, .12, .12, '#e4d49f', g).rotation.y = -.7; cube(.19, 0, -.36, .45, .12, .12, '#e4d49f', g).rotation.y = .7;
      indicator(n, '#898598'); obstacles.push({ x: n.x, z: n.z, r: .72 });
    }
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, x = Math.cos(a) * 7, z = -38 + Math.sin(a) * 7; const h = 1 + (i % 3) * .5; block(x, ground(x, z) + h / 2, z, .65, h, .65, '#85869c'); block(x, ground(x, z) + h, z, .3, .12, .3, '#c3bce0'); }

    [[-28, -11], [28, -12], [0, -27.5]].forEach(([x, z], id) => { const n = node('plaque', id, x, z, '阅读遗迹石碑'); block(x, n.y + .65, z, 1.8, 1.3, .35, ['#c3b38c', '#8aa590', '#a3a0b7'][id]); for (let j = 0; j < 3; j++) block(x, n.y + .9 - j * .25, z + .19, 1.1 - j * .17, .07, .05, '#5f715e'); obstacles.push({ x, z, r: .55 }); });

    MEMORIES.forEach((m, i) => { const n = node('memory', i, m.x, m.z, m.name); n.object = cube(m.x, n.y + .4, m.z, .25, .6, .25, '#d7dcb4'); n.object.material = n.object.material.clone(); block(m.x, n.y + .13, m.z, .7, .16, .7, '#a39b74'); });
    // 岸边旧船与远方的守光人石椅，是支线内容的环境地标。
    for (let i = 0; i < 5; i++) { const x = -16 + i * .8; block(x, ground(-14, 19) + .18, 20.5, .7, .3, 1.6 - Math.abs(i - 2) * .3, '#8e7958'); }
    block(-14, ground(-14, 19) + 1.2, 20.5, .12, 2.4, .12, '#b7a579'); block(-10, ground(-10, -43) + .5, -44, 2.5, .2, 1, '#999b8d');
    // 将十二个可变色标记合为一次实例化绘制，颜色变化仍保持独立。
    this.indicatorNodes = this.nodes.filter(n => n.indicator || n.object);
    this.indicatorBatch = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({color:'#ffffff'}), this.indicatorNodes.length);
    this.indicatorNodes.forEach((n, i) => { const m = n.indicator || n.object; m.updateMatrix(); this.indicatorBatch.setMatrixAt(i, m.matrix); scene.remove(m); });
    this.indicatorBatch.computeBoundingSphere(); scene.add(this.indicatorBatch);
    this.sync();
  }
  solved(id) { return id === 0 ? this.wind.length === 3 : id === 1 ? this.moss.size === 3 : this.stars.every((n, i) => n === i + 1); }
  export() { return { wind: [...this.wind], moss: [...this.moss], stars: [...this.stars] }; }
  reset() { this.wind = []; this.moss.clear(); this.stars = [0, 0, 0]; this.memories.clear(); this.charge = 0; this.activePlate = -1; this.sync(); }
  sync() {
    for (const n of this.nodes) {
      if (n.type === 'bell') n.indicator.material.color.set(this.wind.includes(n.id) ? '#f6d58b' : '#6b7960');
      if (n.type === 'plate') n.indicator.material.color.set(this.moss.has(n.id) ? '#d2efb2' : '#6c9182');
      if (n.type === 'disc') { n.arrow.rotation.y = -this.stars[n.id] * Math.PI / 2; n.indicator.material.color.set(this.stars[n.id] === n.id + 1 ? '#dfceff' : '#898598'); }
      if (n.type === 'memory') n.object.material.color.set(this.memories.has(n.id) ? '#8b9b7c' : '#fff0b4');
    }
    this.updateIndicators();
  }
  updateIndicators() { this.indicatorNodes?.forEach((n, i) => this.indicatorBatch.setColorAt(i, (n.indicator || n.object).material.color)); if (this.indicatorBatch?.instanceColor) this.indicatorBatch.instanceColor.needsUpdate = true; }
  nearest(player) {
    let result = null, min = 2.25;
    for (const n of this.nodes) { if (n.type === 'plate' || (n.type === 'memory' && this.memories.has(n.id))) continue; const d = Math.hypot(player.x - n.x, player.z - n.z); if (d < min) { min = d; result = n; } }
    if (result?.type === 'bell') result.label = `${result.name} · 敲响${this.solved(0) ? '（已完成）' : ` ${this.wind.length} / 3`}`;
    if (result?.type === 'disc') result.label = `${result.name} · ${['北', '东', '南', '西'][this.stars[result.id]]} · 转动星盘`;
    return result;
  }
  interact(n, showHint) {
    if (n.type === 'plaque') { showHint(n.id); return; }
    if (n.type === 'memory') { this.memories.add(n.id); this.audio.tone(659.25, 1.4, .3); this.toast(`拾得旅行记忆 · ${n.name}（${this.memories.size}/3）`); this.sync(); this.changed(); return; }
    const before = [0, 1, 2].map(i => this.solved(i));
    if (n.type === 'bell') { this.audio.chime(n.id); if (!this.solved(0)) { const expected = [0, 2, 1]; if (n.id === expected[this.wind.length]) { this.wind.push(n.id); this.toast(`风铃回应了你 · ${this.wind.length} / 3`); } else { this.wind = n.id === 0 ? [0] : []; this.toast('风声散开了。石碑提示：低音 → 高音 → 中音。'); } } }
    if (n.type === 'disc') { if (this.solved(2)) { this.toast('星盘已归位。晶核在神殿中央等你。'); return; } this.stars[n.id] = (this.stars[n.id] + 1) % 4; this.audio.tone(330 + this.stars[n.id] * 55, .4, .22); }
    this.sync(); this.changed(); this.announceSolved(before);
  }
  announceSolved(before) { for (let i = 0; i < 3; i++) if (!before[i] && this.solved(i)) { this.audio.success(); this.toast(['风铃和鸣。风之晶核已在遗迹中央苏醒。', '水脉重新流动。苔之晶核已在庭院中央苏醒。', '星光汇聚。星之晶核已在神殿中央苏醒。'][i]); } }
  tick(player, dt, time) {
    let plate = null;
    for (const n of this.nodes) if (n.type === 'plate' && !this.moss.has(n.id) && Math.hypot(player.x - n.x, player.z - n.z) < .85 && Math.abs(player.y - n.y - 1.65) < .22) plate = n;
    if (plate) {
      if (this.activePlate !== plate.id) { this.activePlate = plate.id; this.charge = 0; }
      this.charge += dt;
      plate.indicator.material.color.setRGB(.45 + this.charge * .3, .65 + this.charge * .2, .5);
      this.updateIndicators();
      if (this.charge >= 1) { const before = [0, 1, 2].map(i => this.solved(i)); this.moss.add(plate.id); this.charge = 0; this.activePlate = -1; this.sync(); this.audio.tone(440 + plate.id * 110, .9, .3); this.toast(`苔纹踏石苏醒 · ${this.moss.size} / 3`); this.changed(); this.announceSolved(before); }
    } else if (this.activePlate !== -1) { this.activePlate = -1; this.charge = 0; this.sync(); }
    for (const a of this.animations) { if (a.type === 'mill') a.object.rotation.z += dt * .35; else a.object.position.x = a.x + Math.sin(time * 1.5 + a.x) * .04; }
    return plate;
  }
}
