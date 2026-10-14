function clip(points,nx,ny,mx,my,folded){
  const result=[];const distance=p=>(p.x-mx)*nx+(p.y-my)*ny;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],da=distance(a),db=distance(b);
    const inside=folded?da>=-1e-8:da<=1e-8,other=folded?db>=-1e-8:db<=1e-8;
    if(inside)result.push(a);
    if(inside!==other){const t=da/(da-db);result.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
  }
  return result;
}
export function foldGeometry(width,height,progress,backward=false){
  const t=Math.max(.0001,Math.min(1,progress));
  const cx=backward?0:width,cy=height;
  const px=backward?2*width*t:width-2*width*t,py=height-Math.sin(Math.PI*t)*height*.3;
  const mx=(cx+px)/2,my=(cy+py)/2,dx=cx-px,dy=cy-py,length=Math.hypot(dx,dy),nx=dx/length,ny=dy/length;
  const rect=[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}];
  const remaining=clip(rect,nx,ny,mx,my,false),folded=clip(rect,nx,ny,mx,my,true),dot=nx*mx+ny*my;
  const matrix=[1-2*nx*nx,-2*nx*ny,-2*nx*ny,1-2*ny*ny,2*nx*dot,2*ny*dot];
  const crease=[];
  for(const p of [...remaining,...folded])if(Math.abs((p.x-mx)*nx+(p.y-my)*ny)<.001&&!crease.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<.01))crease.push(p);
  return {remaining,folded,matrix,crease,angle:Math.atan2(ny,nx),progress:t};
}
export function polygonCss(points){return points.length>=3?`polygon(${points.map(p=>`${p.x.toFixed(3)}px ${p.y.toFixed(3)}px`).join(',')})`:'polygon(0 0,0 0,0 0)';}
