const EPS=1e-8;
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
export const polygonArea=points=>points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2;
export function cleanPolygon(points) {
  const unique=points.filter((p,i)=>{const q=points[(i+1)%points.length];return Math.hypot(p[0]-q[0],p[1]-q[1])>EPS;});
  if(unique.length<3||Math.abs(polygonArea(unique))<EPS)return [];
  return polygonArea(unique)<0?unique.reverse():unique;
}
export function roofPlane(points) {
  const [p,q]=points;
  const r=points.slice(2).find(r=>Math.abs(cross(p,q,r))>EPS);
  const det=cross(p,q,r),dx=q[0]-p[0],dy=q[1]-p[1],dz=q[2]-p[2];
  const a=(dz*(r[1]-p[1])-(r[2]-p[2])*dy)/det;
  const b=(dx*(r[2]-p[2])-(r[0]-p[0])*dz)/det;
  return {a,b,c:p[2]-a*p[0]-b*p[1]};
}
export const planeHeight=(plane,x,y)=>plane.a*x+plane.b*y+plane.c;
export function clipPolygon(points,distance) {
  const out=[];
  for(let i=0;i<points.length;i++){
    const p=points[i],q=points[(i+1)%points.length],dp=distance(p),dq=distance(q);
    if(dp>=-EPS)out.push(p);
    if((dp>EPS&&dq<-EPS)||(dp<-EPS&&dq>EPS)){
      const t=dp/(dp-dq);out.push(p.map((v,k)=>v+(q[k]-v)*t));
    }
  }
  return cleanPolygon(out);
}
function subtractPolygon(subject,occluder) {
  let intersection=subject;
  for(let i=0;i<occluder.length&&intersection.length;i++)intersection=clipPolygon(intersection,p=>cross(occluder[i],occluder[(i+1)%occluder.length],p));
  if(!intersection.length)return [subject];
  let inside=subject;const outside=[];
  for(let i=0;i<occluder.length&&inside.length;i++){
    const a=occluder[i],b=occluder[(i+1)%occluder.length];
    const piece=clipPolygon(inside,p=>-cross(a,b,p));if(piece.length)outside.push(piece);
    inside=clipPolygon(inside,p=>cross(a,b,p));
  }
  return outside;
}

/** Upper envelope: split intersecting roof planes at their true intersection lines.
 * Every retained patch is convex and has no positive-area overlap in plan view.
 */
export function resolveRoofPanels(raw) {
  const panels=raw.map(p=>({...p,points:cleanPolygon(p.points)})).filter(p=>p.points.length);
  const planes=panels.map(p=>roofPlane(p.points)),result=[];
  for(let i=0;i<panels.length;i++){
    let pieces=[panels[i].points];const a=planes[i];
    for(let j=0;j<panels.length&&pieces.length;j++){
      if(i===j)continue;const b=planes[j];
      const coplanar=Math.abs(a.a-b.a)+Math.abs(a.b-b.b)+Math.abs(a.c-b.c)<EPS;
      if(coplanar&&j>i)continue;
      const cover=coplanar?panels[j].points:clipPolygon(panels[j].points,p=>planeHeight(b,p[0],p[1])-planeHeight(a,p[0],p[1]));
      if(cover.length)pieces=pieces.flatMap(piece=>subtractPolygon(piece,cover));
    }
    for(const [patch,points] of pieces.entries())result.push({...panels[i],patch,points:points.map(([x,y])=>[x,y,planeHeight(a,x,y)])});
  }
  return result;
}

/** Parameter interval where a line crosses one convex roof patch. */
export function lineInterval(points,x,y,dx,dy) {
  let lo=-Infinity,hi=Infinity;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],v=cross(a,b,[x,y]);
    const slope=(b[0]-a[0])*dy-(b[1]-a[1])*dx;
    if(Math.abs(slope)<EPS){if(v<-EPS)return null;continue;}
    const t=-v/slope;if(slope>0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
  }
  return hi-lo>EPS?[lo,hi]:null;
}
