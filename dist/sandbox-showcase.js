import {Sandbox} from './sandbox-core.js';
// 首页仅展示搭建示例，独立于用户的创造、生存世界，不写入用户存档。
export function showcase(){const w=new Sandbox('creative');
  for(let x=18;x<=36;x++)for(let z=29;z<=44;z++){for(let y=4;y<23;y++)w.set(x,y,z,0);w.set(x,3,z,1);}
  for(let x=25;x<=31;x++)for(let z=32;z<=38;z++)w.set(x,4,z,8);
  for(let y=5;y<=7;y++)for(let x=25;x<=31;x++)for(let z=32;z<=38;z++)if(x===25||x===31||z===32||z===38){const corner=(x===25||x===31)&&(z===32||z===38),door=z===38&&x===28&&y<7,window=y===6&&((z===38&&[26,30].includes(x))||(x===31&&[34,35,36].includes(z)));if(!door)w.set(x,y,z,corner?4:window?7:6);}
  // 台阶状双坡屋顶，在像素方块轮廓中保留清楚的屋檐与屋脊。
  for(let x=24;x<=32;x++)for(let z=31;z<=39;z++){const y=8+Math.min(x-24,32-x,3);w.set(x,y,z,8);if(z===31||z===39)for(let yy=8;yy<y;yy++)w.set(x,yy,z,6);}
  for(let z=39;z<=44;z++)for(let x=27;x<=29;x++)w.set(x,3,z,13);
  for(const x of [25,31]){w.set(x,4,40,4);w.set(x,5,40,9);}for(let z=31;z<=38;z+=2){w.set(22,4,z,4);w.set(22,5,z,5);}
  w.set(27,5,34,10);w.set(29,5,34,11);w.tree(35,4,31);w.tree(19,4,33);w.player={x:24,y:4,z:41,hp:100,food:100};w.day=85;w.markAll();return w;
}
