import { useId } from 'react';

const colours = { living: '#e7eddb', kitchen: '#e7eddb', bedroom: '#f2e9d7', bathroom: '#dfeaf0', office: '#e6e2ed', utility: '#e9e9e2', hall: '#f9f8f2' };
function Furniture({ room: r }) {
  const stroke = '#899288';
  const bedX = r.x + (r.x > 4 ? 1.05 : .45);
  if (r.type === 'bedroom') return <g fill="#fffdf7" stroke={stroke} strokeWidth=".035"><rect x={bedX} y={r.y + 1.05} width="1.5" height="2" rx=".06" /><rect x={bedX + .08} y={r.y + 1.12} width=".62" height=".35" rx=".06" /><rect x={bedX + .8} y={r.y + 1.12} width=".62" height=".35" rx=".06" /><path d={`M${bedX} ${r.y + 1.6}h1.5`} /><rect x={r.x + r.width - .65} y={r.y + 1.4} width=".5" height="1.5" /></g>;
  if (r.type === 'bathroom') return <g fill="white" stroke={stroke} strokeWidth=".035"><rect x={r.x + .2} y={r.y + r.depth - 1} width="1.5" height=".7" rx=".2" /><rect x={r.x + 2.5} y={r.y + r.depth - .75} width=".7" height=".55" rx=".08" /><ellipse cx={r.x + 2} cy={r.y + r.depth - .6} rx=".22" ry=".3" /></g>;
  if (r.type === 'utility') return <rect x={r.x + .25} y={r.y + r.depth - .8} width={r.width - .5} height=".55" fill="white" stroke={stroke} strokeWidth=".035" />;
  if (r.type === 'office') return <g fill="#fff" stroke={stroke} strokeWidth=".035"><rect x={r.x + .35} y={r.y + 1.6} width="1.6" height=".65" /><rect x={r.x + .95} y={r.y + 2.3} width=".5" height=".5" rx=".08" /></g>;
  const kitchenX = r.x + r.width - 2.6;
  return <g fill="#fffdf7" stroke={stroke} strokeWidth=".035">{r.type === 'living' && <><rect x={r.x + .45} y={r.y + 1.15} width="2.5" height=".8" rx=".13" /><rect x={r.x + .95} y={r.y + 2.25} width="1.4" height=".65" rx=".08" /><rect x={r.x + .5} y={r.y + 3.45} width="2.4" height=".3" /><ellipse cx={r.x + (r.width > 6 ? 4.5 : r.width - 1.4)} cy={r.y + 3.15} rx=".85" ry=".55" /></>}{(r.type === 'kitchen' || r.width > 6) && <><rect x={kitchenX} y={r.y + 1.1} width="2.4" height=".6" /><rect x={r.x + r.width - .75} y={r.y + 1.1} width=".6" height="1.65" /><circle cx={kitchenX + .4} cy={r.y + 1.4} r=".12" /><rect x={kitchenX + .8} y={r.y + 2.9} width="1.5" height=".65" rx=".05" /></>}</g>;
}

function Door({ door: d }) {
  const colour = '#475b4b';
  if (d.axis === 'x') return <g><path d={`M${d.x} ${d.y}h${d.length}`} stroke="#f9f8f2" strokeWidth=".24" />{!d.opening && <><path d={`M${d.x} ${d.y}v${d.length}`} stroke={colour} strokeWidth=".045" /><path d={`M${d.x + d.length} ${d.y}A${d.length} ${d.length} 0 0 1 ${d.x} ${d.y + d.length}`} fill="none" stroke={colour} strokeWidth=".025" /></>}</g>;
  const dx = d.side === 'left' ? -d.length : d.length;
  return <g><path d={`M${d.x} ${d.y}v${d.length}`} stroke="#f9f8f2" strokeWidth=".24" /><path d={`M${d.x} ${d.y}h${dx}`} stroke={colour} strokeWidth=".045" /><path d={`M${d.x} ${d.y + d.length}A${d.length} ${d.length} 0 0 ${d.side === 'left' ? 1 : 0} ${d.x + dx} ${d.y}`} fill="none" stroke={colour} strokeWidth=".025" /></g>;
}

export function FloorPlan({ house: h }) {
  const tileId = useId().replace(/:/g, '') + '-bathroom-tile';
  return <svg className="house-floorplan" role="img" aria-label={`Floor plan with living space, ${h.rooms.filter((r) => r.type === 'bedroom').length} bedrooms, bathrooms and a central hallway. Entrance at the front.`} viewBox={`-1.2 -1.6 ${h.width + 2.4} ${h.length + 3}`}>
    <defs><pattern id={tileId} width=".35" height=".35" patternUnits="userSpaceOnUse"><path d="M.35 0H0V.35" fill="none" stroke="#bacfd6" strokeWidth=".015" /></pattern></defs>
    <path d={`M0 -.8H${h.width} M0 -1v.4 M${h.width} -1v.4`} stroke="#98a48f" strokeWidth=".03" /><text x={h.width / 2} y="-1" textAnchor="middle" fontSize=".28" fill="#52674d">{h.width.toFixed(1)} m</text>
    <rect width={h.width} height={h.length} fill="#f9f8f2" stroke="#334a3c" strokeWidth=".18" />
    {h.rooms.map((r) => <g key={r.id}><rect x={r.x} y={r.y} width={r.width} height={r.depth} fill={colours[r.type]} stroke="#334a3c" strokeWidth=".12" />{r.type === 'bathroom' && <rect x={r.x} y={r.y} width={r.width} height={r.depth} fill={`url(#${tileId})`} />}<Furniture room={r} />{r.type === 'hall' ? <text x={r.x + r.width / 2} y={r.y + r.depth / 2} textAnchor="middle" fontSize=".25" fill="#657457" transform={`rotate(-90 ${r.x + r.width / 2} ${r.y + r.depth / 2})`}>HALLWAY / 1.2 m</text> : <><text x={r.x + r.width / 2} y={r.y + .45} textAnchor="middle" fontSize=".29" fontWeight="600" fill="#2c4034">{r.name}</text><text x={r.x + r.width / 2} y={r.y + .79} textAnchor="middle" fontSize=".23" fill="#677263">{r.width.toFixed(1)} x {r.depth.toFixed(1)} m</text></>}</g>)}
    {h.doors.map((d, i) => <Door key={i} door={d} />)}
    {h.windows.map((w, i) => <g key={i} stroke="#5e93a4" strokeWidth=".055"><path d={w.axis === 'x' ? `M${w.x} ${w.y}h${w.length}` : `M${w.x} ${w.y}v${w.length}`} stroke="#edf8fa" strokeWidth=".2" /><path d={w.axis === 'x' ? `M${w.x} ${w.y - .06}h${w.length}m-${w.length} .12h${w.length}` : `M${w.x - .06} ${w.y}v${w.length}m.12 -${w.length}v${w.length}`} /></g>)}
    <path d={`M${h.width / 2} -1.15v.9m-.15 -.15.15 .15.15 -.15`} fill="none" stroke="#285c46" strokeWidth=".04" />
    <text x={h.width / 2} y="-1.4" textAnchor="middle" fontSize=".27" fill="#52674d">FRONT ENTRANCE / ROAD: {h.entranceEdge.toUpperCase()}</text>
    <text x={h.width + .55} y={h.length / 2} textAnchor="middle" fontSize=".28" fill="#52674d" transform={`rotate(90 ${h.width + .55} ${h.length / 2})`}>{h.length.toFixed(1)} m</text>
  </svg>;
}

export function HousePreview({ house: h, roofVisible }) {
  // Axonometric projection of the exact footprint, openings and room geometry.
  const project = (x, y, z = 0) => [x * 22 + y * 15, x * 10 - y * 9 - z * 24];
  const polygon = (points) => points.map(([x, y, z]) => project(x, y, z).join(',')).join(' ');
  const W = h.width, L = h.length, H = roofVisible ? 2.8 : .45;
  const minY = -L * 9 - 110;
  const pitched = h.style === 'Traditional';
  const roofColour = pitched ? '#9b604d' : h.style === 'Minimalist' ? '#adab9b' : '#53625b';
  return <svg className="house-exterior" role="img" aria-label={roofVisible ? `${h.style} single-storey house exterior with roof, entrance and windows, based on the floor plan.` : 'Cutaway house showing the same rooms and hallway as the floor plan.'} viewBox={`-65 ${minY} ${W * 22 + L * 15 + 130} ${L * 9 + W * 10 + 170}`}>
    <polygon points={polygon([[-1.5,-2,0],[W+1.5,-2,0],[W+1.5,L+1.5,0],[-1.5,L+1.5,0]])} fill="#dfe8d3" />
    <polygon points={polygon([[3.8,-2,.02],[5,-2,.02],[5,0,.02],[3.8,0,.02]])} fill="#c7c7b6" />
    <polygon points={polygon([[0,0,0],[W,0,0],[W,L,0],[0,L,0]])} fill="#f0ede3" stroke="#596b5b" strokeWidth="1" />
    {!roofVisible && h.rooms.map((r) => <polygon key={r.id} points={polygon([[r.x,r.y,0],[r.x+r.width,r.y,0],[r.x+r.width,r.y+r.depth,0],[r.x,r.y+r.depth,0]])} fill={colours[r.type]} stroke="#647969" strokeWidth="1.5" />)}
    <polygon points={polygon([[W,0,0],[W,L,0],[W,L,H],[W,0,H]])} fill="#d5d3c7" stroke="#657165" />
    <polygon points={polygon([[0,0,0],[W,0,0],[W,0,H],[0,0,H]])} fill={h.style === 'Minimalist' ? '#e9dfcc' : '#f5f1e6'} stroke="#657165" />
    {roofVisible && h.windows.filter((w) => w.axis === 'x' || w.x > W - 1).map((w, i) => <g key={i}><polygon points={w.axis === 'x' ? polygon([[w.x,0,.85],[w.x+w.length,0,.85],[w.x+w.length,0,2],[w.x,0,2]]) : polygon([[W,w.y,.85],[W,w.y+w.length,.85],[W,w.y+w.length,2],[W,w.y,2]])} fill="#8eaeb6" stroke="#fffdf5" strokeWidth="3" /></g>)}
    {roofVisible && <polygon points={polygon([[3.9,0,0],[4.9,0,0],[4.9,0,2.15],[3.9,0,2.15]])} fill="#755c45" stroke="#eee9da" strokeWidth="2" />}
    {roofVisible && <circle cx={project(4.75,0,1.1)[0]} cy={project(4.75,0,1.1)[1]} r="1.8" fill="#ead8af" />}
    {roofVisible && (pitched ? <><polygon points={polygon([[0,-.3,H],[W/2,-.3,4],[W/2,L+.3,4],[0,L+.3,H]])} fill={roofColour} stroke="#584b42" /><polygon points={polygon([[W/2,-.3,4],[W,-.3,H],[W,L+.3,H],[W/2,L+.3,4]])} fill="#b0785d" stroke="#584b42" /><polygon points={polygon([[0,0,H],[W,0,H],[W/2,0,4]])} fill="#eee6d5" stroke="#657165" /></> : <><polygon points={polygon([[-.2,-.2,H+.15],[W+.2,-.2,H+.15],[W+.2,L+.2,H+.15],[-.2,L+.2,H+.15]])} fill={roofColour} stroke="#344a40" /><path d={`M${project(-.2,-.2,H+.15).join(',')}L${project(W+.2,-.2,H+.15).join(',')}`} stroke="#35463c" strokeWidth="5" /></>)}
    <text x="-30" y={W * 10 + 40} fontSize="10" fill="#5c7351">{roofVisible ? `${h.style.toUpperCase()} / SINGLE STOREY` : 'CUTAWAY / SAME FLOOR PLAN'}</text>
  </svg>;
}

