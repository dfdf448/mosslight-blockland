// 静态障碍分桶，移动与相机只检查附近物体。
export class ObstacleGrid {
  constructor(items,size=4){this.size=size;this.buckets=new Map();for(const item of items){const key=Math.floor(item.x/size)+','+Math.floor(item.z/size);if(!this.buckets.has(key))this.buckets.set(key,[]);this.buckets.get(key).push(item);}}
  nearby(x,z,radius=2.6){const result=[];for(let ix=Math.floor((x-radius)/this.size);ix<=Math.floor((x+radius)/this.size);ix++)for(let iz=Math.floor((z-radius)/this.size);iz<=Math.floor((z+radius)/this.size);iz++){const values=this.buckets.get(ix+','+iz);if(values)result.push(...values);}return result;}
  blocked(x,z,radius=.28){return this.nearby(x,z,2).some(o=>(x-o.x)**2+(z-o.z)**2<(o.r+radius)**2);}
  cameraBlocked(x,y,z,ground){if(y<Math.max(ground(x,z),-.36)+.23)return true;return this.nearby(x,z).some(o=>{const r=o.cameraRadius||o.r+.15;return (x-o.x)**2+(z-o.z)**2<r*r&&y<ground(o.x,o.z)+(o.height||3.2)&&y>ground(o.x,o.z)-.2;});}
}
