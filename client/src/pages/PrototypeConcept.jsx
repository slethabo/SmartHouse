import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Button } from '../components/ui/Button';
import { createHouseConcept } from '../demo/layout';
import { HouseElevation } from '../components/plans/HouseElevation';

const House3DView = lazy(() => import('../components/plans/House3DView'));

const money = (value) => value.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 });
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

function FloorPlan({ house: h }) {
  return <svg className="house-floorplan" role="img" aria-label={`Floor plan with living space, ${h.rooms.filter((r) => r.type === 'bedroom').length} bedrooms, bathrooms and a central hallway. Entrance at the front.`} viewBox={`-1.2 -1.6 ${h.width + 2.4} ${h.length + 3}`}>
    <defs><pattern id="bathroom-tile" width=".35" height=".35" patternUnits="userSpaceOnUse"><path d="M.35 0H0V.35" fill="none" stroke="#bacfd6" strokeWidth=".015" /></pattern></defs>
    <path d={`M0 -.8H${h.width} M0 -1v.4 M${h.width} -1v.4`} stroke="#98a48f" strokeWidth=".03" /><text x={h.width / 2} y="-1" textAnchor="middle" fontSize=".28" fill="#52674d">{h.width.toFixed(1)} m</text>
    <rect width={h.width} height={h.length} fill="#f9f8f2" stroke="#334a3c" strokeWidth=".18" />
    {h.rooms.map((r) => <g key={r.id}><rect x={r.x} y={r.y} width={r.width} height={r.depth} fill={colours[r.type]} stroke="#334a3c" strokeWidth=".12" />{r.type === 'bathroom' && <rect x={r.x} y={r.y} width={r.width} height={r.depth} fill="url(#bathroom-tile)" />}<Furniture room={r} />{r.type === 'hall' ? <text x={r.x + r.width / 2} y={r.y + r.depth / 2} textAnchor="middle" fontSize=".25" fill="#657457" transform={`rotate(-90 ${r.x + r.width / 2} ${r.y + r.depth / 2})`}>HALLWAY / 1.2 m</text> : <><text x={r.x + r.width / 2} y={r.y + .45} textAnchor="middle" fontSize=".29" fontWeight="600" fill="#2c4034">{r.name}</text><text x={r.x + r.width / 2} y={r.y + .79} textAnchor="middle" fontSize=".23" fill="#677263">{r.width.toFixed(1)} x {r.depth.toFixed(1)} m</text></>}</g>)}
    {h.doors.map((d, i) => <Door key={i} door={d} />)}
    {h.windows.map((w, i) => <g key={i} stroke="#5e93a4" strokeWidth=".055"><path d={w.axis === 'x' ? `M${w.x} ${w.y}h${w.length}` : `M${w.x} ${w.y}v${w.length}`} stroke="#edf8fa" strokeWidth=".2" /><path d={w.axis === 'x' ? `M${w.x} ${w.y - .06}h${w.length}m-${w.length} .12h${w.length}` : `M${w.x - .06} ${w.y}v${w.length}m.12 -${w.length}v${w.length}`} /></g>)}
    <path d={`M${h.width / 2} -1.15v.9m-.15 -.15.15 .15.15 -.15`} fill="none" stroke="#285c46" strokeWidth=".04" />
    <text x={h.width / 2} y="-1.4" textAnchor="middle" fontSize=".27" fill="#52674d">FRONT ENTRANCE / ROAD: {h.entranceEdge.toUpperCase()}</text>
    <text x={h.width + .55} y={h.length / 2} textAnchor="middle" fontSize=".28" fill="#52674d" transform={`rotate(90 ${h.width + .55} ${h.length / 2})`}>{h.length.toFixed(1)} m</text>
  </svg>;
}

function HousePreview({ house: h, roofVisible }) {
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

export function PrototypeConcept({ brief }) {
  const house = useMemo(() => createHouseConcept(brief.brief.answers), [brief]);
  const [roofVisible, setRoofVisible] = useState(false);
  const [view, setView] = useState('3d');
  const [exteriorView, setExteriorView] = useState('front');
  const floorPlan = useRef(null);
  const a = brief.brief.answers;
  function downloadPlan() {
    const svg = floorPlan.current?.querySelector('svg')?.cloneNode(true);
    if (!svg) return;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', '900');
    svg.setAttribute('height', String(Math.round(900 * (house.length + 3) / (house.width + 2.4))));
    svg.setAttribute('style', 'background:white;font-family:Arial,sans-serif');
    const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url; link.download = `smarthouse-floor-plan-${brief.version}.svg`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function download() {
    const blob = new Blob([JSON.stringify({ stage: 'frontend house concept', briefVersion: brief.version, brief: brief.brief, house, assumptions: 'Demo 1 m plot allowance; illustrative gross floor-area pricing, with contingency assumed within the demo rate. Professional dimensional, site and construction checks still needed.' }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `smarthouse-concept-${brief.version}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="studio-panel concept-panel"><div className="studio-section-title"><div><span className="studio-eyebrow">YOUR HOUSE CONCEPT</span><h2>A home with room for your life.</h2></div><span className="studio-count">Version {brief.version}</span></div><p className="consultation-intro">Shared living spaces at the front. Private rooms connected by a central hallway. Every bedroom and bathroom has its own access from the hall.</p>
    <div className="concept-stats"><div><small>GROSS FLOOR AREA</small><strong>{house.footprintArea.toFixed(1)} m<sup>2</sup></strong></div><div><small>ROOMS</small><strong>{a.bedrooms} bed / {a.bathrooms} bath</strong></div><div><small>DEMO ESTIMATE</small><strong>{money(house.total)}</strong></div><div><small>BUDGET CHECK</small><strong className={house.withinBudget ? 'concept-within' : 'concept-over'}>{house.withinBudget ? 'Within demo budget' : 'Over budget'}</strong></div></div>
    {house.conflicts.length > 0 && <div className="house-conflicts" role="status"><strong>This option needs adjustment</strong>{house.conflicts.map((conflict) => <p key={conflict}>{conflict}</p>)}</div>}
    <div className="house-view-tabs" aria-label="House views">{[['3d', 'Interactive 3D'], ['exterior', 'Exterior views'], ['plan', 'Floor plan'], ['cutaway', 'Inside the layout']].map(([key, label]) => <button type="button" key={key} aria-pressed={view === key} onClick={() => setView(key)} className={view === key ? 'is-active' : ''}>{label}</button>)}</div>
    {view === '3d' && <Suspense fallback={<div className="studio-empty" role="status">Loading your 3D house...</div>}><House3DView house={house} /></Suspense>}
    <div hidden={view !== 'exterior'} className="house-showcase"><div className="house-showcase-heading"><div><span className="studio-eyebrow">PICTURE YOUR HOME</span><h3>{house.style} single-storey exterior</h3><p>A view of the home you would arrive at, with entrance and window positions from your floor plan.</p></div><div className="house-angle-switch" aria-label="Exterior viewpoint">{[['front', 'Front'], ['side', 'Side'], ['perspective', 'Perspective']].map(([key, label]) => <button type="button" key={key} aria-pressed={exteriorView === key} className={exteriorView === key ? 'is-active' : ''} onClick={() => setExteriorView(key)}>{label}</button>)}</div></div>
      {exteriorView === 'perspective' ? <div className="house-perspective-stage"><HousePreview house={house} roofVisible /></div> : <HouseElevation house={house} side={exteriorView === 'side'} />}
      <div className="house-materials"><span><i style={{ background: house.style === 'Traditional' ? '#f0dfc2' : house.style === 'Minimalist' ? '#ded6c7' : '#f2eee4' }} />{house.style === 'Traditional' ? 'Warm plaster' : house.style === 'Minimalist' ? 'Sand render' : 'Light render'}</span><span><i style={{ background: house.style === 'Traditional' ? '#97604e' : '#3b4948' }} />{house.style === 'Traditional' ? 'Pitched tile roof' : 'Flat roof profile'}</span><span><i style={{ background: '#759ba5' }} />Glazed windows</span><span><i style={{ background: '#916a49' }} />Timber-look entrance</span></div><p className="house-appearance-note">Materials and landscaping show an illustrative finish. Change your architectural style in the consultation to explore another appearance.</p>
    </div>
    <div hidden={view !== 'plan'} className="concept-canvas"><h3>Floor plan / {house.width.toFixed(1)} x {house.length.toFixed(1)} m</h3><div ref={floorPlan}><FloorPlan house={house} /></div><div className="house-legend"><span><i style={{ background: colours.living }} /> Living</span><span><i style={{ background: colours.bedroom }} /> Bedrooms</span><span><i style={{ background: colours.bathroom }} /> Bathrooms</span></div></div>
    <div hidden={view !== 'cutaway'} className="concept-canvas house-preview-panel"><div className="house-preview-toolbar"><h3>Explore the layout</h3><button className="btn btn--secondary btn--sm" type="button" aria-pressed={!roofVisible} onClick={() => setRoofVisible((r) => !r)}>{roofVisible ? 'Show cutaway' : 'Show roof'}</button></div><HousePreview house={house} roofVisible={roofVisible} /><p>The roof and room arrangement use the same dimensions as the floor plan.</p></div>
    <details className="house-layout-explainer"><summary>Layout reasoning and cost assumptions</summary><div className="house-design-notes"><div><h3>Why this layout works</h3><p>Bedrooms are separated from the shared living area. A {house.circulationArea.toFixed(1)} m<sup>2</sup> hallway connects all private rooms. Exterior windows bring light into each bedroom and bathroom.{a.kitchen === 'Separate' ? ' The kitchen has a direct door to the living area.' : ' Cooking, dining and living share an open front space.'}</p></div><div><h3>Plot and cost assumptions</h3><p>{house.fitsPlot ? 'The footprint fits' : 'The footprint does not fit'} the demo plot envelope with 1 m allowances on each boundary. Estimated cost uses gross floor area, including circulation and a wall allowance, at R{house.rate.toLocaleString('en-ZA')} / m<sup>2</sup> for {a.finish.toLowerCase()} finishes.</p></div></div></details>
    <details className="concept-details"><summary>Concept assumptions and next design steps</summary><p>This is an adaptable prototype layout with indicative furniture and door swings. Roof/style choices are illustrative. Structural design, exact wall/door clearances, accessibility, daylight performance, services and local planning requirements need further design review. Recorded extra features are not automatically added. A layout that exceeds your plot or budget remains a flagged option, not a feasible recommendation.</p></details><div className="house-downloads"><Button onClick={downloadPlan}>Download floor plan (SVG)</Button><Button variant="secondary" onClick={download}>Download concept data (JSON)</Button></div><p>Revise your consultation and confirm again to update the house.</p>
  </section>;
}
