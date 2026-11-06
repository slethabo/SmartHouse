import { useId } from 'react';
import { exteriorWallProfile } from '../../demo/architecture';
import { MultiStoreyDrawing } from './MultiStoreyDrawing';

/** Orthographic projection of exposed facade segments, including recessed entrances. */
export function HouseElevation({house:h,side=false}) {
  return h.floors?<MultiStoreyDrawing house={h} side={side} elevation/>:<SingleHouseElevation house={h} side={side}/>;
}

function SingleHouseElevation({house:h,side=false}) {
  const id=useId().replace(/:/g,''),extent=side?h.length:h.width,scale=Math.min(70,750/extent),left=(900-extent*scale)/2,ground=350;
  const edge=side?'right':'front';
  const facades=h.walls.filter(w=>w.exterior&&w.edge===edge).sort((a,b)=>side?a.x-b.x:b.y-a.y);
  const coordinate=(x,y)=>left+(side?y:x)*scale;
  return <svg className="house-elevation" role="img" aria-label={`${side?'Right side':'Front'} elevation of ${h.template.name}, with ${h.roofDesign} roof and source-plan setbacks.`} viewBox="0 0 900 470">
    <defs><linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#e4edf0"/><stop offset="1" stopColor="#fbf8ef"/></linearGradient>
      <linearGradient id={`${id}-glass`} x2="1" y2="1"><stop stopColor="#638e9a"/><stop offset=".5" stopColor="#c3dcde"/><stop offset="1" stopColor="#7196a0"/></linearGradient></defs>
    <rect width="900" height="470" rx="16" fill={`url(#${id}-sky)`}/>
    <path d="M0 345Q200 320 450 342T900 337V470H0Z" fill="#dce5cf"/>
    <ellipse cx="450" cy="360" rx="400" ry="17" fill="#7e8d78" opacity=".18"/>
    {facades.map((w,i)=>{
      const endX=w.x+(w.axis==='x'?w.length:0),endY=w.y+(w.axis==='y'?w.length:0),x=coordinate(w.x,w.y),end=coordinate(endX,endY);
      const profile=exteriorWallProfile(h,w);
      const top=ground-profile[0].height*scale,topEnd=ground-profile[profile.length-1].height*scale;
      const roofLine=profile.map(p=>`${x+p.offset*scale},${ground-p.height*scale}`).join(' ');
      const room=h.rooms.find(r=>r.id===w.roomId),accent=['service','garage'].includes(room.zone);
      const openings=[...h.windows,...h.doors.filter(d=>d.entrance||d.garage)].filter(o=>o.axis===w.axis&&Math.abs((o.axis==='x'?o.y:o.x)-(w.axis==='x'?w.y:w.x))<.001&&(o.axis==='x'?o.x>=w.x-.001&&o.x+o.length<=w.x+w.length+.001:o.y>=w.y-.001&&o.y+o.length<=w.y+w.length+.001));
      return <g key={i}>
        <polygon points={`${x},${ground} ${end},${ground} ${profile.slice().reverse().map(p=>`${x+p.offset*scale},${ground-p.height*scale}`).join(' ')}`} fill={accent?'#c6b9a1':'#f2eee4'} stroke="#a29e90" strokeWidth="1"/>
        {accent&&Array.from({length:Math.floor(w.length/.22)},(_,j)=><path key={j} d={`M${x+(j+.5)*.22*scale} ${Math.max(top,topEnd)+8}V${ground}`} stroke="#9e8d72" strokeOpacity=".25"/>)}
        <polyline points={roofLine} fill="none" stroke={h.style==='Traditional'?'#805e4f':'#44534e'} strokeWidth="8"/>
        <rect x={x} y={ground-7} width={end-x} height="7" fill="#6d7569" opacity=".3"/>
        {openings.map((o,j)=>{
          const ox=coordinate(o.x,o.y),isWindow=Boolean(o.roomId),height=isWindow?1.15:o.garage?2.4:2.15,oy=ground-(isWindow?2:height)*scale,ow=o.length*scale;
          return <g key={j}><rect x={ox-3} y={oy-3} width={ow+6} height={height*scale+6} fill="#394b46"/>
            <rect x={ox} y={oy} width={ow} height={height*scale} fill={isWindow?`url(#${id}-glass)`:o.garage?'#55635b':'#a57c54'}/>
            {isWindow?<path d={`M${ox+ow/2} ${oy}v${height*scale}`} stroke="#394b46" strokeWidth="3"/>:o.garage?[.4,.8,1.2,1.6,2].map(n=><path key={n} d={`M${ox} ${ground-n*scale}h${ow}`} stroke="#adb6aa" strokeWidth="1"/>):<>
              <rect x={ox+ow*.8} y={ground-1.2*scale} width="3" height="17" fill="#e5dac3"/>
              <path d={`M${ox-10} ${oy-13}h${ow+20}`} stroke="#43534b" strokeWidth="6"/>
              <polygon points={`${ox-6},${ground+4} ${ox+ow+6},${ground+4} ${ox+ow+25},420 ${ox-25},420`} fill="#cbbfa7"/>
            </>}
          </g>;
        })}
      </g>;
    })}
    {[left-15,left+extent*scale+15].map((x,i)=><g key={i}><rect x={x-12} y="330" width="24" height="24" fill="#857d6a"/><ellipse cx={x} cy="322" rx="22" ry="25" fill="#7f956d"/></g>)}
    <text x="35" y="440" fontSize="12" fill="#53634d">{side?'RIGHT ELEVATION':'FRONT ELEVATION'} / {h.roofDesign.toUpperCase()}</text>
    <text x="865" y="440" textAnchor="end" fontSize="12" fill="#53634d">{extent.toFixed(1)} m / {h.template.name}</text>
  </svg>;
}
