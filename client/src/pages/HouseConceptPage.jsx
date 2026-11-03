import { lazy, Suspense, useId, useMemo, useRef, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { HouseElevation } from '../components/plans/HouseElevation';
import { FloorPlan, HousePreview } from '../components/plans/ConceptDrawings';
import { createHouseConcept } from '../demo/layout';
import { buildBreakdown } from '../demo/estimator';
import '../styles/house-concept.css';

const House3DView = lazy(() => import('../components/plans/House3DView'));
const money = (value) => value.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 });
const VIEWS = [
  { id: 'front', label: 'Front exterior', icon: 'house', caption: 'Your welcome home. Entrance and windows follow the floor plan.' },
  { id: 'side', label: 'Side exterior', icon: 'eye', caption: 'A different angle on your home, with windows along the private rooms.' },
  { id: 'perspective', label: 'Perspective', icon: 'layers', caption: 'An architectural illustration of your home’s shape and selected roof style.' },
  { id: 'plan', label: 'Floor plan', icon: 'grid', caption: 'Follow the room arrangement, dimensions, doors and windows.' },
  { id: '3d', label: 'Interactive 3D', icon: 'refresh', caption: 'Explore your house: rotate, zoom and remove the roof to look inside.' },
  { id: 'inside', label: 'Inside the layout', icon: 'eye', caption: 'A cutaway illustration showing the rooms connected by the hallway.' },
];
const COST_LABELS = { structure: 'Structure', finishes: 'Finishes', services: 'Services', professional_fees: 'Professional fees', contingency: 'Contingency' };

function saveFile(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Presentation consumes the existing confirmed brief; persistence stays in the adapter. */
export function HouseConceptPage({ brief }) {
  const house = useMemo(() => createHouseConcept(brief.brief.answers), [brief]);
  const breakdown = useMemo(() => buildBreakdown(house.total), [house.total]);
  const [view, setView] = useState('front');
  const [downloadError, setDownloadError] = useState('');
  const floorPlan = useRef(null);
  const id = useId().replace(/:/g, '');
  const a = brief.brief.answers;
  const activeView = VIEWS.find((item) => item.id === view);
  const budgetDifference = Number(a.budget) - house.total;
  const editPath = `/projects/${brief.project_id}?mode=brief`;
  const recordedNeeds = [
    ['Accessibility', a.accessibility !== 'None stated' ? [a.accessibility, a.accessibilityNotes].filter(Boolean).join(': ') : null],
    ['Guest accommodation', a.guestNeeds], ['Storage and outdoor needs', a.storage],
    ['Other essentials', a.essentials], ['Optional features', a.optionalFeatures], ['Future plans', a.futurePlans],
  ].filter(([, value]) => value);

  function downloadPlan() {
    setDownloadError('');
    try {
      const svg = floorPlan.current?.querySelector('svg')?.cloneNode(true);
      if (!svg) throw new Error('The floor plan is not ready. Please try again.');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('width', '900');
      svg.setAttribute('height', String(Math.round(900 * (house.length + 3) / (house.width + 2.4))));
      svg.setAttribute('style', 'background:white;font-family:Arial,sans-serif');
      saveFile(svg.outerHTML, 'image/svg+xml', `smarthouse-floor-plan-v${brief.version}.svg`);
    } catch (error) { setDownloadError(error.message || 'The floor plan could not be downloaded.'); }
  }
  function downloadConcept() {
    setDownloadError('');
    try {
      saveFile(JSON.stringify({ stage: 'schematic house concept', briefVersion: brief.version,
        brief: brief.brief, house, estimate: { total: house.total, currency: 'ZAR', breakdown },
        assumptions: 'Demo 1 m boundary allowances and illustrative gross floor-area rates. Contingency is included in the total. Professional site, dimensional and construction checks are required.' }, null, 2),
      'application/json', `smarthouse-concept-v${brief.version}.json`);
    } catch { setDownloadError('The concept data could not be downloaded. Please try again.'); }
  }

  return <article className="home-concept" aria-labelledby={`${id}-title`}>
    <header className="home-concept-intro">
      <div><span className="hc-eyebrow">FROM YOUR BRIEF TO YOUR HOME</span>
        <h2 id={`${id}-title`}>{a.style} living. <em>Made for you.</em></h2>
        <p>A first look at a home shaped around your rooms, your land and your everyday life.</p>
      </div>
      <span className="hc-version"><Icon name="check" size={15} /> Confirmed brief · v{brief.version}</span>
    </header>

    <div className="hc-overview">
      <section className="hc-gallery" aria-label="Your house gallery">
        <div className="hc-gallery-stage" id={`${id}-gallery`}>
          <div className="hc-gallery-label"><span>{a.style} / Single storey</span><span>Schematic concept</span></div>
          <div className={`hc-gallery-art hc-gallery-art--${view}`}>
            {view === 'front' && <HouseElevation house={house} />}
            {view === 'side' && <HouseElevation house={house} side />}
            {view === 'perspective' && <HousePreview house={house} roofVisible />}
            {view === 'inside' && <HousePreview house={house} roofVisible={false} />}
            {/* Keep the SVG mounted so downloads work from every gallery view. */}
            <div hidden={view !== 'plan'} ref={floorPlan}><FloorPlan house={house} /></div>
            {view === '3d' && <Suspense fallback={<div className="hc-loading" role="status">Preparing your interactive house…</div>}><House3DView house={house} /></Suspense>}
          </div>
          <div className="hc-gallery-caption" aria-live="polite"><span>{String(VIEWS.indexOf(activeView) + 1).padStart(2, '0')} / 06</span><p>{activeView.caption}</p></div>
        </div>
        <div className="hc-gallery-choices" role="group" aria-label="Choose a house view">
          {VIEWS.map((item) => <button type="button" key={item.id} aria-pressed={view === item.id} aria-controls={`${id}-gallery`}
            onClick={() => setView(item.id)}><Icon name={item.icon} size={21} /><span>{item.label}</span></button>)}
        </div>
      </section>

      <aside className="hc-summary" aria-label="Design summary and estimate">
        <span className="hc-eyebrow">YOUR HOME, AT A GLANCE</span>
        <h3>{a.bedrooms}-bedroom {a.style.toLowerCase()} home</h3>
        <p className="hc-summary-copy">{a.kitchen === 'Separate' ? 'A separate kitchen, shared living spaces' : 'Open living, dining and kitchen'} and a private bedroom wing.</p>
        <dl className="hc-quick-specs">
          {[['bed', a.bedrooms, 'Bedrooms'], ['bath', a.bathrooms, 'Bathrooms'], ['ruler', `${house.footprintArea.toFixed(1)} m²`, 'Gross floor area'], ['layers', '1', 'Storey']].map(([icon, value, label]) =>
            <div key={label}><Icon name={icon} /><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <div className="hc-price"><span>ILLUSTRATIVE CONSTRUCTION ESTIMATE</span><strong>{money(house.total)}</strong><small>{a.finish} finish · {money(house.rate)} / m²</small></div>
        <div className={`hc-budget ${house.withinBudget ? '' : 'hc-budget--over'}`}>
          <Icon name={house.withinBudget ? 'check' : 'alert'} size={17} />
          <div><strong>{house.withinBudget ? 'Within your demo budget' : 'Above your demo budget'}</strong>
            <span>{money(Math.abs(budgetDifference))} {house.withinBudget ? 'remaining' : 'over'} · Budget {money(Number(a.budget))}</span></div>
        </div>
        <Button to={editPath} icon="edit" block>Refine my brief</Button>
        <a className="hc-text-link" href={`#${id}-downloads`}>Keep a copy of your concept <Icon name="arrowRight" size={15} /></a>
        <p className="hc-summary-footnote">An early design for exploring possibilities. Site checks and professional review come next.</p>
      </aside>
    </div>

    {house.conflicts.length > 0 && <section className="hc-conflicts" aria-label="Design conflicts" role="status">
      <Icon name="alert" /><div><h3>A few things need adjusting</h3>{house.conflicts.map((conflict) => <p key={conflict}>{conflict}</p>)}
        <a href={editPath}>Review your requirements</a></div>
    </section>}

    <nav className="hc-section-nav" aria-label="Concept sections">
      <a href={`#${id}-details`}>The design</a><a href={`#${id}-costs`}>Cost & budget</a><a href={`#${id}-plot`}>Your plot</a><a href={`#${id}-downloads`}>Downloads</a>
    </nav>

    <div className="hc-detail-grid">
      <section className="hc-section" id={`${id}-details`} aria-labelledby={`${id}-details-title`}>
        <span className="hc-eyebrow">ROOM FOR THE WAY YOU LIVE</span><h3 id={`${id}-details-title`}>A closer look at your layout.</h3>
        <p>Shared spaces welcome you at the front. A central hallway connects the private rooms, with exterior windows to each bedroom and bathroom.</p>
        <div className="hc-feature-chips"><span><Icon name="check" size={14} />{a.kitchen === 'Separate' ? 'Separate kitchen' : 'Open-plan living'}</span>
          <span><Icon name="check" size={14} />{house.circulationArea.toFixed(1)} m² circulation</span>
          {house.rooms.some((room) => room.type === 'office') && <span><Icon name="check" size={14} />Dedicated office</span>}
          <span><Icon name="check" size={14} />{a.style === 'Traditional' ? 'Pitched roof' : 'Flat roof profile'}</span></div>
        <details className="hc-accordion"><summary>Room dimensions <span>{house.rooms.length} spaces</span></summary>
          <div className="hc-table-wrap"><table><caption className="visually-hidden">Generated room dimensions and areas</caption><thead><tr><th scope="col">Space</th><th scope="col">Dimensions</th><th scope="col">Area</th></tr></thead>
            <tbody>{house.rooms.map((room) => <tr key={room.id}><th scope="row">{room.name}</th><td>{room.width.toFixed(1)} × {room.depth.toFixed(1)} m</td><td>{room.area.toFixed(1)} m²</td></tr>)}</tbody></table></div>
          <p className="hc-fine-print">Room areas exclude walls. The construction estimate uses the gross building area.</p>
        </details>
        {recordedNeeds.length > 0 && <details className="hc-accordion"><summary>Needs recorded for further review</summary><p>These requests are saved in your brief. They have not been automatically resolved in this layout.</p>
          <dl className="hc-recorded-needs">{recordedNeeds.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>}
      </section>

      <section className="hc-section hc-cost-section" id={`${id}-costs`} aria-labelledby={`${id}-cost-title`}>
        <span className="hc-eyebrow">KNOW WHAT YOU ARE PLANNING FOR</span><h3 id={`${id}-cost-title`}>Your construction estimate.</h3>
        <p>{house.footprintArea.toFixed(2)} m² × {money(house.rate)} / m². The total is allocated below, including contingency.</p>
        <dl className="hc-cost-lines">{Object.entries(breakdown).map(([key, value]) => <div key={key}><dt>{COST_LABELS[key]}{key === 'contingency' && <small>Included in total</small>}</dt><dd>{money(value)}</dd></div>)}
          <div className="hc-cost-total"><dt>Estimated total</dt><dd>{money(house.total)}</dd></div></dl>
        <p className="hc-fine-print">Illustrative allocations, not measured quantities or a quotation. Land, finance, site-specific work and approval costs are not independently calculated.</p>
        <details className="hc-accordion"><summary>Your stated budget inclusions</summary><p>{a.budgetIncludes}</p><p className="hc-fine-print">Recorded from your brief; the estimate does not automatically price each listed item.</p></details>
      </section>

      <section className="hc-section hc-plot-section" id={`${id}-plot`} aria-labelledby={`${id}-plot-title`}>
        <div className="hc-section-heading"><div><span className="hc-eyebrow">MADE TO MEET YOUR LAND</span><h3 id={`${id}-plot-title`}>How it sits on your plot.</h3></div>
          <span className={`hc-fit-badge ${house.fitsPlot ? '' : 'hc-fit-badge--over'}`}><Icon name={house.fitsPlot ? 'check' : 'alert'} size={15} />{house.fitsPlot ? 'Fits demo envelope' : 'Needs a larger envelope'}</span></div>
        <dl className="hc-plot-facts"><div><dt>Your plot</dt><dd>{a.width} × {a.length} m</dd></div><div><dt>House footprint</dt><dd>{house.width.toFixed(1)} × {house.length.toFixed(1)} m</dd></div>
          <div><dt>Road access</dt><dd>{a.access === 'Unknown' ? 'Not specified' : a.access}</dd></div><div><dt>Boundary allowance</dt><dd>1 m each side</dd></div></dl>
        <p className="hc-fine-print">Plot fit uses your road-access orientation and demo boundary allowances. Terrain: {a.terrain.toLowerCase()}. Local setbacks, coverage rules, services and ground conditions still need checking.</p>
      </section>
    </div>

    <section className="hc-downloads" id={`${id}-downloads`} aria-labelledby={`${id}-download-title`}>
      <div><span className="hc-eyebrow">THE NEXT CHAPTER STARTS HERE</span><h3 id={`${id}-download-title`}>Take your concept with you.</h3><p>Keep the floor plan and design details for your next conversation.</p></div>
      <div className="hc-download-actions"><Button onClick={downloadPlan} icon="grid">Floor plan · SVG</Button><Button variant="secondary" onClick={downloadConcept} icon="layers">Concept details · JSON</Button></div>
      {downloadError && <p className="hc-download-error" role="alert">{downloadError}</p>}
    </section>
    <footer className="hc-footer"><Icon name="info" size={17} /><p>This concept reflects confirmed brief v{brief.version}. Edit your brief and confirm again to revise the house. Drawings, furniture and materials are indicative; detailed engineering, accessibility and construction approval require professional review.</p></footer>
  </article>;
}
