import { useId } from 'react';
import { placeFurniture } from '../../demo/furniture';
import { roofPanels, exteriorHeight } from '../../demo/architecture';

const colours = { living: '#e7eddb', kitchen: '#e7eddb', bedroom: '#f2e9d7', bathroom: '#dfeaf0', office: '#e6e2ed', utility: '#e9e9e2', hall: '#f9f8f2', dining: '#efe3cd', entertainment: '#e2decf', dressing: '#e8dcca', garage: '#d5d9d7' };
function Furniture({ room }) {
  return <g fill="#fffdf7" stroke="#899288" strokeWidth=".035">{placeFurniture(room).map((f,index)=><g key={index}>
    <rect x={f.x} y={f.y} width={f.width} height={f.depth} rx={f.kind==='bed'||f.kind==='sofa'||f.kind==='car'?.08:.02} />
    {f.kind==='bed'&&<><rect x={f.x+.08} y={f.y+.1} width=".6" height=".3" rx=".04" /><rect x={f.x+.82} y={f.y+.1} width=".6" height=".3" rx=".04" /><path d={`M${f.x} ${f.y+.55}h${f.width}`} /></>}
  </g>)}</g>;
}

function Door({ door: d }) {
  const colour = '#475b4b';
  if (d.garage) return <path d={`M${d.x} ${d.y}${d.axis==='x'?'h':'v'}${d.length}`} stroke="#52675e" strokeWidth=".1" />;
  if (d.axis === 'x') return <g><path d={`M${d.x} ${d.y}h${d.length}`} stroke="#f9f8f2" strokeWidth=".24" />{!d.opening && <><path d={`M${d.x} ${d.y}v${d.length}`} stroke={colour} strokeWidth=".045" /><path d={`M${d.x + d.length} ${d.y}A${d.length} ${d.length} 0 0 1 ${d.x} ${d.y + d.length}`} fill="none" stroke={colour} strokeWidth=".025" /></>}</g>;
  const dx = d.side === 'left' ? -d.length : d.length;
  return <g><path d={`M${d.x} ${d.y}v${d.length}`} stroke="#f9f8f2" strokeWidth=".24" /><path d={`M${d.x} ${d.y}h${dx}`} stroke={colour} strokeWidth=".045" /><path d={`M${d.x} ${d.y + d.length}A${d.length} ${d.length} 0 0 ${d.side === 'left' ? 1 : 0} ${d.x + dx} ${d.y}`} fill="none" stroke={colour} strokeWidth=".025" /></g>;
}

export function FloorPlan({ house: h }) {
  const tileId = useId().replace(/:/g, '') + '-bathroom-tile';
  const entrance = h.doors.find((d) => d.entrance);
  const drawWidth=Math.max(h.width,...(h.terraces||[]).map(t=>t.x+t.width)),drawLength=Math.max(h.length,...(h.terraces||[]).map(t=>t.y+t.depth));
  return <svg className="house-floorplan" role="img" aria-label={`${h.template.name} floor plan with ${h.rooms.filter((r) => r.type === 'bedroom').length} bedrooms. Source plan ${h.template.sourceId}, adapted to your brief.`} viewBox={`-1.2 -2.2 ${drawWidth+2.4} ${drawLength+3.6}`}>
    <title>{`${h.template.name} / adapted concept`}</title>
    <desc>{`${h.template.adaptation} Source: Floor Plans 500, plan ${h.template.sourceId}, Roboflow umair-ab9ex, ${h.template.sourceUrl}, ${h.template.license} as declared by the supplied dataset export.`}</desc>
    <defs><pattern id={tileId} width=".35" height=".35" patternUnits="userSpaceOnUse"><path d="M.35 0H0V.35" fill="none" stroke="#bacfd6" strokeWidth=".015" /></pattern></defs>
    <path d={`M0 -.8H${h.width} M0 -1v.4 M${h.width} -1v.4`} stroke="#98a48f" strokeWidth=".03" /><text x={h.width/2} y="-1" textAnchor="middle" fontSize=".28" fill="#52674d">{h.width.toFixed(1)} m</text>
    {(h.terraces||[]).map((t,i)=><g key={`terrace-${i}`}><rect x={t.x} y={t.y} width={t.width} height={t.depth} fill="#e1d8c6" stroke="#a89e87" strokeWidth=".04" /><text x={t.x+t.width/2} y={t.y+t.depth/2} fontSize=".2" textAnchor="middle" fill="#786d58">{t.name}</text></g>)}
    {h.rooms.map((r)=><g key={r.id}><rect x={r.x} y={r.y} width={r.width} height={r.depth} fill={colours[r.type]} />{r.type==='bathroom'&&<rect x={r.x} y={r.y} width={r.width} height={r.depth} fill={`url(#${tileId})`} />}<Furniture room={r} />{r.addition&&<rect x={r.x+.08} y={r.y+.08} width={r.width-.16} height={r.depth-.16} fill="none" stroke="#b9975e" strokeWidth=".035" strokeDasharray=".15 .1" />}
      {r.type==='hall'?<text x={r.x+r.width/2} y={r.y+r.depth/2} textAnchor="middle" fontSize=".23" fill="#657457" transform={`rotate(-90 ${r.x+r.width/2} ${r.y+r.depth/2})`}>{r.name.toUpperCase()} / {r.width.toFixed(1)} m</text>:<><text x={r.x+r.width/2} y={r.y+.4} textAnchor="middle" fontSize={Math.min(.29,r.width/(r.name.length*.65))} fontWeight="600" fill="#2c4034">{r.name}</text><text x={r.x+r.width/2} y={r.y+.73} textAnchor="middle" fontSize=".22" fill="#677263">{r.width.toFixed(1)} x {r.depth.toFixed(1)} m</text></>}
    </g>)}
    {h.walls.map((w,i)=><path key={i} d={`M${w.x} ${w.y}${w.axis==='x'?'h':'v'}${w.length}`} stroke="#334a3c" strokeWidth={w.exterior?.18:.12} />)}
    {h.doors.map((d,i)=><Door key={i} door={d} />)}
    {h.windows.map((w,i)=><g key={i} stroke="#5e93a4" strokeWidth=".055"><path d={w.axis==='x'?`M${w.x} ${w.y}h${w.length}`:`M${w.x} ${w.y}v${w.length}`} stroke="#edf8fa" strokeWidth=".2" /><path d={w.axis==='x'?`M${w.x} ${w.y-.06}h${w.length}m-${w.length} .12h${w.length}`:`M${w.x-.06} ${w.y}v${w.length}m.12 -${w.length}v${w.length}`} /></g>)}
    <circle cx={entrance.x+(entrance.axis==='x'?entrance.length/2:0)} cy={entrance.y+(entrance.axis==='y'?entrance.length/2:0)} r=".16" fill="#d1a55d" stroke="#fff" strokeWidth=".04" />
    <text x={h.width/2} y="-1.4" textAnchor="middle" fontSize=".25" fill="#52674d">{h.template.name.toUpperCase()} / ROAD: {h.entranceEdge.toUpperCase()}</text>
    <text x={h.width/2} y={drawLength+.75} textAnchor="middle" fontSize=".22" fill="#786d58">GOLD DOT: ENTRANCE / DASHED ROOMS: REQUESTED ADDITIONS</text>
    <text x={h.width+.55} y={h.length/2} textAnchor="middle" fontSize=".28" fill="#52674d" transform={`rotate(90 ${h.width+.55} ${h.length/2})`}>{h.length.toFixed(1)} m</text>
  </svg>;
}

export function HousePreview({ house:h,roofVisible }) {
  const project=(x,y,z=0)=>[x*22+y*15,x*10-y*9-z*24];
  const polygon=points=>points.map(([x,y,z])=>project(x,y,z).join(',')).join(' ');
  const surfaces=roofPanels(h),minY=-h.length*9-145;
  const depth=p=>p.reduce((sum,[x,y])=>sum+y-x,0)/p.length;
  const walls=h.walls.filter(w=>w.exterior&&['front','right'].includes(w.edge)).map(w=>{
    const endX=w.x+(w.axis==='x'?w.length:0),endY=w.y+(w.axis==='y'?w.length:0);
    return {w,points:[[w.x,w.y,0],[endX,endY,0],[endX,endY,roofVisible?exteriorHeight(h,w,endX):.4],[w.x,w.y,roofVisible?exteriorHeight(h,w):.4]]};
  }).sort((a,b)=>depth(b.points)-depth(a.points));
  return <svg className="house-exterior" role="img" aria-label={`${h.template.name}: ${roofVisible?h.roofDesign+' exterior':'floor-plan cutaway'}, following the actual footprint and setbacks.`} viewBox={`-85 ${minY} ${h.width*22+h.length*15+190} ${h.length*9+h.width*10+220}`}>
    <polygon points={polygon([[-2,-3,0],[h.width+2,-3,0],[h.width+2,h.length+2,0],[-2,h.length+2,0]])} fill="#e3e9d9" />
    {(h.terraces||[]).map((t,i)=><polygon key={i} points={polygon([[t.x,t.y,0],[t.x+t.width,t.y,0],[t.x+t.width,t.y+t.depth,0],[t.x,t.y+t.depth,0]])} fill="#cbbfa7" stroke="#ac9d82" />)}
    {h.rooms.map(r=><polygon key={r.id} points={polygon([[r.x,r.y,0],[r.x+r.width,r.y,0],[r.x+r.width,r.y+r.depth,0],[r.x,r.y+r.depth,0]])} fill={colours[r.type]} stroke="#8e9988" strokeWidth="1" />)}
    {!roofVisible&&h.rooms.flatMap(r=>placeFurniture(r).map((f,i)=><polygon key={`${r.id}-${i}`} points={polygon([[f.x,f.y,.06],[f.x+f.width,f.y,.06],[f.x+f.width,f.y+f.depth,.06],[f.x,f.y+f.depth,.06]])} fill="#fffdf5" stroke="#899288" strokeWidth=".7" />))}
    {walls.map(({w,points},i)=>{
      const openings=[...h.windows,...h.doors.filter(d=>d.entrance||d.garage)].filter(o=>o.axis===w.axis&&Math.abs((o.axis==='x'?o.y:o.x)-(w.axis==='x'?w.y:w.x))<.001&&(o.axis==='x'?o.x>=w.x-.001&&o.x+o.length<=w.x+w.length+.001:o.y>=w.y-.001&&o.y+o.length<=w.y+w.length+.001));
      return <g key={i}><polygon points={polygon(points)} fill={w.edge==='front'?'#f4f0e5':'#c8c7b9'} stroke="#879084" strokeWidth=".8" />
        {roofVisible&&openings.map((o,j)=>{
          const bottom=o.roomId?.85:0,top=o.roomId?2: o.garage?2.4:2.15;
          const ex=o.x+(o.axis==='x'?o.length:0),ey=o.y+(o.axis==='y'?o.length:0);
          return <polygon key={j} points={polygon([[o.x,o.y,bottom],[ex,ey,bottom],[ex,ey,top],[o.x,o.y,top]])} fill={o.roomId?'#88adb5':o.garage?'#485653':'#9d7855'} stroke="#3c4b46" strokeWidth="2.2" />;
        })}
      </g>;
    })}
    {roofVisible&&surfaces.sort((a,b)=>depth(b.points)-depth(a.points)).map((p,i)=><g key={i}>
      <polygon points={polygon(p.points.map(([x,y,z])=>[x,y,z-.14]))} fill="#35433e" stroke="#35433e" strokeWidth="2" />
      <polygon points={polygon(p.points)} fill={h.style==='Traditional'?'#8e6958':p.zone==='public'?'#596661':'#788079'} stroke={h.style==='Traditional'?'#80604f':'#788079'} strokeWidth=".5" />
    </g>)}
    <text x="-40" y={h.width*10+46} fontSize="11" fill="#5c7351">{h.template.name.toUpperCase()} / {roofVisible?h.roofDesign.toUpperCase():'CUTAWAY'}</text>
  </svg>;
}
