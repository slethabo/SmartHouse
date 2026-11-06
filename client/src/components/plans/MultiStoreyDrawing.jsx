import { exteriorWallProfile, roofPanels, roofEdgeFaces } from '../../demo/architecture';
import { selectFloor } from '../../demo/multiStorey';
import { placeFurniture } from '../../demo/furniture';

/** Orthographic/axonometric views use the same per-floor geometry as Three.js. */
export function MultiStoreyDrawing({house:h,side=false,elevation=false,roofVisible=true,floorId}) {
  const project=([x,y,z=0])=>elevation?[(side?y:x)*28,-z*28]:[x*22+y*15,x*10-y*9-z*24];
  const polygon=points=>points.map(p=>project(p).join(',')).join(' ');
  const selected=h.floors.find(f=>f.id===floorId)||h.floors[0];
  const floors=roofVisible?h.floors:[selected],surfaces=[];
  const depth=points=>points.reduce((sum,[x,y,z])=>sum+(elevation?(side?-x:y):y-x-z*1.2),0)/points.length;
  for(const floor of floors){
    const house=selectFloor(h,floor.id),base=roofVisible?floor.elevation:0;
    for(const r of floor.rooms){
      if(!elevation)surfaces.push({points:[[r.x,r.y,base],[r.x+r.width,r.y,base],[r.x+r.width,r.y+r.depth,base],[r.x,r.y+r.depth,base]],fill:r.type==='stairs'?'#c9b899':'#e8dfcb'});
      if(!roofVisible)for(const f of placeFurniture(r))surfaces.push({points:[[f.x,f.y,base+.05],[f.x+f.width,f.y,base+.05],[f.x+f.width,f.y+f.depth,base+.05],[f.x,f.y+f.depth,base+.05]],fill:'#fffdf5'});
    }
    for(const t of floor.terraces){
      surfaces.push({points:[[t.x,t.y,base],[t.x+t.width,t.y,base],[t.x+t.width,t.y+t.depth,base],[t.x,t.y+t.depth,base]],fill:'#c4b69c'});
      if(roofVisible)for(const edge of t.guardEdges||[]){
        const a=edge==='back'?[t.x,t.y+t.depth]:[t.x+t.width,t.y],b=[t.x+t.width,t.y+t.depth];
        surfaces.push({points:[[...a,base],[...b,base],[...b,base+1.1],[...a,base+1.1]],fill:'#a7c0c4'});
      }
    }
    const edges=elevation?[side?'right':'front']:['front','right'];
    for(const w of floor.walls.filter(w=>w.exterior&&edges.includes(w.edge))){
      const ex=w.x+(w.axis==='x'?w.length:0),ey=w.y+(w.axis==='y'?w.length:0);
      const profile=roofVisible?exteriorWallProfile(house,w):[{offset:0,height:.45},{offset:w.length,height:.45}];
      const points=[[w.x,w.y,base],[ex,ey,base],...profile.slice().reverse().map(p=>[w.x+(w.axis==='x'?p.offset:0),w.y+(w.axis==='y'?p.offset:0),base+p.height])];
      const openings=[...floor.windows,...floor.doors.filter(d=>d.entrance||d.garage||d.terrace)].filter(o=>o.axis===w.axis&&Math.abs((o.axis==='x'?o.y:o.x)-(w.axis==='x'?w.y:w.x))<.001&&
        (o.axis==='x'?o.x>=w.x-.001&&o.x+o.length<=w.x+w.length+.001:o.y>=w.y-.001&&o.y+o.length<=w.y+w.length+.001));
      surfaces.push({points,fill:w.edge==='front'?'#f1eadc':'#c8c4b6',openings:roofVisible?openings:[],base});
    }
  }
  if(roofVisible)for(const p of [...roofPanels(h),...roofEdgeFaces(h)])surfaces.push({points:p.points,fill:p.type?'#405049':h.roofDesign==='Multi-hip'?'#95634e':'#58676a'});
  const projected=surfaces.flatMap(s=>s.points.map(project)),minX=Math.min(...projected.map(p=>p[0]))-35,maxX=Math.max(...projected.map(p=>p[0]))+35;
  const minY=Math.min(...projected.map(p=>p[1]))-35,maxY=Math.max(...projected.map(p=>p[1]))+55;
  return <svg className={elevation?'house-elevation':'house-exterior'} viewBox={`${minX} ${minY} ${maxX-minX} ${maxY-minY}`} role="img"
    aria-label={`${h.storeys}-storey ${h.template.name}, ${elevation?side?'side elevation':'front elevation':roofVisible?'perspective':selected.name+' cutaway'}`}>
    <rect x={minX} y={minY} width={maxX-minX} height={maxY-minY} fill="#e9eee3"/>
    {surfaces.sort((a,b)=>depth(b.points)-depth(a.points)).map((s,i)=><g key={i}>
      <polygon points={polygon(s.points)} fill={s.fill} stroke="#738073" strokeWidth=".6"/>
      {s.openings?.map((o,j)=>{
        const bottom=o.roomId?.85:0,top=o.roomId?2:o.garage?2.4:2.15,ex=o.x+(o.axis==='x'?o.length:0),ey=o.y+(o.axis==='y'?o.length:0);
        return <polygon key={j} points={polygon([[o.x,o.y,s.base+bottom],[ex,ey,s.base+bottom],[ex,ey,s.base+top],[o.x,o.y,s.base+top]])} fill={o.roomId?'#8caeb8':o.garage?'#53645b':'#9b7653'} stroke="#40514b" strokeWidth="1.4"/>;
      })}
    </g>)}
    <text x={minX+15} y={maxY-15} fontSize="10" fill="#52674e">{roofVisible?`${h.storeys} STOREYS / ${h.roofDesign.toUpperCase()}`:selected.name.toUpperCase()+' / CUTAWAY'}</text>
  </svg>;
}
