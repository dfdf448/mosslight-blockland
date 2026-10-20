import * as THREE from './vendor/three.module.js';

// 所有静态方块共用顶点色材质，按空间分块，减少材质切换和绘制调用。
export const voxelMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
const unit = new THREE.BoxGeometry(1, 1, 1);
export function mergeBlocks(blocks, material = voxelMaterial) {
  const positions = [], normals = [], colors = [], indices = [];
  const p = unit.attributes.position, n = unit.attributes.normal, baseIndices = unit.index.array;
  let offset = 0;
  for (const b of blocks) {
    const [x, y, z, sx, sy, sz, color] = b;
    const c = new THREE.Color(color);
    for (let v = 0; v < p.count; v++) {
      positions.push(p.getX(v) * sx + x, p.getY(v) * sy + y, p.getZ(v) * sz + z);
      normals.push(n.getX(v), n.getY(v), n.getZ(v)); colors.push(c.r, c.g, c.b);
    }
    for (const index of baseIndices) indices.push(index + offset);
    offset += p.count;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeBoundingSphere();
  return new THREE.Mesh(geometry, material);
}
export function mergeWorld(batches, scene) {
  const chunks = new Map();
  for (const [color, blocks] of batches) for (const b of blocks) {
    const key = `${Math.floor(b[0] / 24)},${Math.floor(b[2] / 24)}`;
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push([...b, color]);
  }
  for (const blocks of chunks.values()) scene.add(mergeBlocks(blocks));
  return chunks.size;
}
// 地形仅生成顶面和露出的侧面，不再绘制埋在地面中的方块内部。
export function terrainMesh(heights, size, tile, random, scene) {
  const positions = [], normals = [], colors = [], indices = [], half = size * tile / 2;
  function quad(vertices, normal, color) {
    const start = positions.length / 3, c = new THREE.Color(color);
    for (const v of vertices) { positions.push(...v); normals.push(...normal); colors.push(c.r, c.g, c.b); }
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const h = heights[j * size + i]; if (h < 0) continue;
    const x = i * tile - half, z = j * tile - half;
    const palette = h === 0 ? ['#c8bb80', '#d6c88e', '#c2b77c'] : ['#729762', '#7e9d69', '#6d925e', '#87a671'];
    const color = palette[Math.floor(random() * palette.length)];
    quad([[x,h,z],[x,h,z+tile],[x+tile,h,z+tile],[x+tile,h,z]], [0,1,0], color);
    for (const [dx,dz,normal] of [[-1,0,[-1,0,0]],[1,0,[1,0,0]],[0,-1,[0,0,-1]],[0,1,[0,0,1]]]) {
      const ni=i+dx,nj=j+dz,neighbor=ni<0||nj<0||ni>=size||nj>=size?-1.5:heights[nj*size+ni];
      if (neighbor >= h) continue; const bottom = Math.max(-1.5, neighbor);
      if (dx === -1) quad([[x,h,z+tile],[x,h,z],[x,bottom,z],[x,bottom,z+tile]],normal,'#707d5d');
      if (dx === 1) quad([[x+tile,h,z],[x+tile,h,z+tile],[x+tile,bottom,z+tile],[x+tile,bottom,z]],normal,'#707d5d');
      if (dz === -1) quad([[x,h,z],[x+tile,h,z],[x+tile,bottom,z],[x,bottom,z]],normal,'#707d5d');
      if (dz === 1) quad([[x+tile,h,z+tile],[x,h,z+tile],[x,bottom,z+tile],[x+tile,bottom,z+tile]],normal,'#707d5d');
    }
    // 保留原随机序列，使植被位置与改版前保持一致。
    if (h === 0) { const hasFoam=random()<.13; if(hasFoam)quad([[x+.18,h+.015,z+.18],[x+.18,h+.015,z+tile-.18],[x+tile-.18,h+.015,z+tile-.18],[x+tile-.18,h+.015,z+.18]],[0,1,0],'#e4d5a0'); }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeBoundingSphere();scene.add(new THREE.Mesh(g,voxelMaterial));return indices.length/3;
}
