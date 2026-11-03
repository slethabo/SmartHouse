import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { HouseElevation } from '../components/plans/HouseElevation';
import { FloorPlan, FloorPlanSet, HousePreview } from '../components/plans/ConceptDrawings';
import { createHouseConcept } from '../demo/layout';
import { estimateHouseFromCatalogue } from '../demo/estimator';
import { loadMaterialPriceBenchmarks, loadProductCatalogue } from '../demo/productCatalogue';
import { formatConsultationAnswer } from '../utils/consultation';
import '../styles/house-concept.css';

const House3DView = lazy(() => import('../components/plans/House3DView'));
const money = (value) => value.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 });
const preciseMoney = (value) => value.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const VIEWS = [
  { id: 'front', label: 'Front exterior', icon: 'house', caption: 'Your welcome home. Entrance and windows follow the floor plan.' },
  { id: 'side', label: 'Side exterior', icon: 'eye', caption: 'A different angle on your home, with windows along the private rooms.' },
  { id: 'perspective', label: 'Perspective', icon: 'layers', caption: 'An architectural illustration of your home’s shape and selected roof style.' },
  { id: 'plan', label: 'Floor plan', icon: 'grid', caption: 'Follow the room arrangement, dimensions, doors and windows.' },
  { id: '3d', label: 'Interactive 3D', icon: 'refresh', caption: 'Explore your house: rotate, zoom and remove the roof to look inside.' },
  { id: 'inside', label: 'Inside the layout', icon: 'eye', caption: 'A cutaway illustration showing the rooms connected by the hallway.' },
];
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
  const [view, setView] = useState('front');
  const [downloadError, setDownloadError] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [selectedFloor,setSelectedFloor]=useState('floor-0');
  const allFloorPlans=useRef(null);
  const [priceDataState, setPriceDataState] = useState({ products: null, benchmarks: null, error: '' });
  const floorPlan = useRef(null);
  const id = useId().replace(/:/g, '');
  const a = { ...brief.brief.answers, style: house.style };
  const activeFloor=house.floors?.find(f=>f.id===selectedFloor)||house.floors?.[0];
  useEffect(() => {
    let active = true;
    Promise.all([loadProductCatalogue(), loadMaterialPriceBenchmarks()]).then(([products, benchmarks]) => {
      if (active) setPriceDataState({ products, benchmarks, error: '' });
    }).catch((error) => {
      if (active) setPriceDataState({ products: null, benchmarks: null, error: error.message || 'Price data could not be loaded.' });
    });
    return () => { active = false; };
  }, []);
  const estimate = useMemo(() => priceDataState.products && priceDataState.benchmarks
    ? estimateHouseFromCatalogue(house, priceDataState.products, priceDataState.benchmarks)
    : null, [house, priceDataState.products, priceDataState.benchmarks]);
  const activeView = VIEWS.find((item) => item.id === view);
  const withinBudget = estimate ? estimate.total <= Number(a.budget) : null;
  const budgetDifference = estimate ? Number(a.budget) - estimate.total : 0;
  const designConflicts = house.conflicts.filter((conflict) => !conflict.toLowerCase().includes('demo estimate'));
  if (estimate && !withinBudget) designConflicts.push(`The estimated construction cost exceeds your budget amount by ${money(Math.abs(budgetDifference))}.`);
  const pricedHouse = estimate ? { ...house, total: estimate.total, withinBudget, conflicts: designConflicts } : house;
  const editPath = `/projects/${brief.project_id}?mode=brief`;
  const recordedNeeds = [
    ['Accessibility', a.accessibility !== 'None stated' ? [a.accessibility, a.accessibilityNotes].filter(Boolean).join(': ') : null],
    ['Guest accommodation', a.guestNeeds], ['Storage and outdoor needs', a.storage],
    ['Other essentials', a.essentials], ['Optional features', a.optionalFeatures], ['Future plans', a.futurePlans],
  ].filter(([, value]) => value);

  function downloadPlan(all=false) {
    setDownloadError('');
    try {
      const svg = (all?allFloorPlans:floorPlan).current?.querySelector('svg')?.cloneNode(true);
      if (!svg) throw new Error('The floor plan is not ready. Please try again.');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('width', '900');
      const bounds=svg.getAttribute('viewBox').split(/\s+/).map(Number);
      svg.setAttribute('height', String(Math.round(900*bounds[3]/bounds[2])));
      svg.setAttribute('style', 'background:white;font-family:Arial,sans-serif');
      saveFile(svg.outerHTML, 'image/svg+xml', `smarthouse-${all?'all-floors':activeFloor?.id||'floor-plan'}-v${brief.version}.svg`);
    } catch (error) { setDownloadError(error.message || 'The floor plan could not be downloaded.'); }
  }
  function downloadConcept() {
    setDownloadError('');
    try {
      saveFile(JSON.stringify({ stage: 'schematic house concept', briefVersion: brief.version,
        brief: brief.brief, house: pricedHouse, estimate: estimate && { ...estimate, currency: 'ZAR' },
        assumptions: 'Fixed, in-stock product prices come from smart_house_products.json. Missing-material and construction rates come from material_price_benchmarks.json and its cited South African sources. Priced material lines are counted within the construction rate materials allocation and are not added a second time; the remaining allocation covers unpriced materials and finishes. Labour, services, professional fees and contingency are included using the stated conservative shares. Quantities are schematic; professional site, dimensional and construction checks are required.' }, null, 2),
      'application/json', `smarthouse-concept-v${brief.version}.json`);
    } catch { setDownloadError('The concept data could not be downloaded. Please try again.'); }
  }

  return <article className="home-concept" aria-labelledby={`${id}-title`}>
    <header className="home-concept-intro">
      <div><span className="hc-eyebrow">FROM YOUR BRIEF TO YOUR HOME</span>
        <h2 id={`${id}-title`}>{a.style} living. <em>Made for you.</em></h2>
        <p>{house.spaceLevel} room sizes and your selected spaces. {house.storeys>1?'An authored multi-storey adaptation inspired by the selected spatial family; the source scan does not supply upper-floor plans.':'A layout adapted from a reviewed floor plan.'}</p>
      </div>
      <span className="hc-version"><Icon name="check" size={15} /> Confirmed brief · v{brief.version}</span>
    </header>

    <div className="hc-overview">
      <section className="hc-gallery" aria-label="Your house gallery">
        <div className="hc-gallery-stage" id={`${id}-gallery`}>
          <div className="hc-gallery-label"><span>{a.style} / {house.storeys||1} {(house.storeys||1)>1?'storeys':'storey'}</span><span>Schematic concept</span></div>
          {house.floors&&<div className="hc-floor-tabs" role="group" aria-label="Choose floor plan">{house.floors.map(f=><button type="button" key={f.id} aria-pressed={activeFloor.id===f.id} onClick={()=>setSelectedFloor(f.id)}>{f.name} <small>{f.area.toFixed(1)} m²</small></button>)}</div>}
          <div className={`hc-gallery-art hc-gallery-art--${view}`}>
            {view === 'inside' && <HousePreview house={house} floorId={activeFloor?.id} roofVisible={false} />}
            {/* Keep the SVG mounted so downloads work from every gallery view. */}
            <div hidden={view !== 'plan'} ref={floorPlan}><FloorPlan house={house} floorId={activeFloor?.id} /></div>
            {house.floors&&<div hidden ref={allFloorPlans}><FloorPlanSet house={house}/></div>}
            {view === 'front' && <HouseElevation house={house} />}
            {view === 'side' && <HouseElevation house={house} side />}
            {view === 'perspective' && <HousePreview house={house} roofVisible />}
            {view === 'plan' && <div className="hc-plan-tools"><Button variant="secondary" size="sm" onClick={() => setPlanOpen(true)} icon="search">Enlarge floor plan</Button></div>}
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
        <p className="hc-summary-copy">{house.layoutDescription} Roof: {house.roofDesign.toLowerCase()}.</p>
        <dl className="hc-quick-specs">
          {[['bed', a.bedrooms, 'Bedrooms'], ['bath', a.bathrooms, 'Bathrooms'], ['ruler', `${house.totalFloorArea.toFixed(1)} m²`, 'Total floor area'], ['layers', house.storeys||1, 'Storeys']].map(([icon, value, label]) =>
            <div key={label}><Icon name={icon} /><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <div className="hc-price"><span>ILLUSTRATIVE CONSTRUCTION ESTIMATE</span><strong>{estimate ? money(estimate.total) : priceDataState.error ? 'Estimate unavailable' : 'Loading material prices…'}</strong>
          <small>Includes materials, finishes, labour, services, professional fees and contingency using conservative South African benchmarks.</small>
          <details className="hc-accordion hc-cost-disclosure" id={`${id}-cost-breakdown`}>
            <summary>View detailed price breakdown</summary>
            {priceDataState.error && <p className="hc-download-error" role="alert">{priceDataState.error}</p>}
            {!estimate && !priceDataState.error && <p role="status">Loading the catalogue and material price benchmarks…</p>}
            {estimate && <>
              <dl className="hc-cost-lines">{estimate.lines.filter((line) => line.quantity > 0).map((line) => <div key={line.key}>
                <dt>{line.label}<small>{line.priced
                  ? <>{line.sourceType === 'catalogue'
                    ? `${line.productName} · ${line.quantity.toLocaleString('en-ZA')} × ${preciseMoney(line.unitPrice)} per ${line.unit} · SKU ${line.sku}`
                    : `${line.quantity.toLocaleString('en-ZA')} × ${preciseMoney(line.unitPrice)} per ${line.unit} · ${line.sourceSummary}`}
                    {' · '}{line.assumption}
                    {line.sources?.length > 0 && <> Sources: {line.sources.map((source, index) => <span key={source.url}>{index > 0 ? ', ' : ' '}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.name} ({source.priceLabel})</a></span>)}</>}
                  </>
                  : line.note}</small></dt><dd>{line.priced ? money(line.total) : 'Not priced'}</dd>
              </div>)}
                <div><dt>Priced material lines (included below)</dt><dd>{money(estimate.pricedMaterialsSubtotal)}</dd></div>
                <div><dt>Other materials and finishes allowance</dt><dd>{money(estimate.otherMaterialsAndFinishes)}</dd></div>
                {estimate.materialOverrun > 0 && <div><dt>Priced materials above base materials allocation</dt><dd>{money(estimate.materialOverrun)}</dd></div>}
                {estimate.structuralAllowanceSubtotal > 0 && <div><dt>Stairs and upper-level structural allowances</dt><dd>{money(estimate.structuralAllowanceSubtotal)}</dd></div>}
                {estimate.categories.map((category) => <div key={category.key}><dt>{category.label}</dt><dd>{money(category.total)}</dd></div>)}
                <div className="hc-cost-total"><dt>Estimated construction total</dt><dd>{money(estimate.total)}</dd></div></dl>
              <p className="hc-fine-print">{estimate.pricingNote}</p>
              <p className="hc-fine-print">The priced-material subtotal and other-materials allowance are details within the Materials and finishes category; only the category rows are added to the total.</p>
              <p className="hc-fine-print">Construction-rate sources: {estimate.constructionSources.map((source, index) => <span key={`${source.url}-${index}`}>{index > 0 ? ', ' : ''}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.name} ({source.priceLabel})</a></span>)}</p>
            </>}
          </details>
        </div>
        {estimate
          ? <div className={`hc-budget ${withinBudget ? '' : 'hc-budget--over'}`}>
              <Icon name={withinBudget ? 'check' : 'alert'} size={17} />
              <div><strong>{withinBudget ? 'Estimated construction cost is within your budget' : 'Estimated construction cost exceeds your budget'}</strong>
                <span>{withinBudget ? `${money(budgetDifference)} budget not yet used` : `${money(Math.abs(budgetDifference))} over budget`} · Budget {money(Number(a.budget))}.</span>
                {!withinBudget && <p>This layout does not meet your budget. Revise the room requirements or budget before treating it as a feasible option.</p>}</div>
            </div>
          : <p role={priceDataState.error ? 'alert' : 'status'}>{priceDataState.error || 'Loading the estimate and budget comparison…'}</p>}
        <Button to={editPath} icon="edit" block>Refine my brief</Button>
        <a className="hc-text-link" href={`#${id}-downloads`}>Keep a copy of your concept <Icon name="arrowRight" size={15} /></a>
        <p className="hc-summary-footnote">An early design for exploring possibilities. Site checks and professional review come next.</p>
      </aside>
    </div>

    <section className="hc-source-plan" aria-label="Floor-plan source and adaptation">
      <a href={house.template.image} target="_blank" rel="noreferrer" className="hc-source-thumbnail" aria-label={`Open original dataset floor plan ${house.template.sourceId}`}>
        <img src={house.template.image} alt={`Original floor plan ${house.template.sourceId}, used as the spatial reference for this adaptation`} loading="lazy" />
      </a>
      <div><span className="hc-eyebrow">BUILT FROM A REVIEWED FLOOR-PLAN FAMILY</span><h3>{house.template.name}</h3>
        <p>{house.selectionReason} {house.template.adaptation}</p>
        <a href={house.template.image} target="_blank" rel="noreferrer">View original plan {house.template.sourceId}</a>
        <details><summary>Source and changes</summary><p>{house.template.review}</p><p>Floor Plans 500 / Roboflow umair-ab9ex · <a href={house.template.sourceUrl} target="_blank" rel="noreferrer">Dataset source</a> · CC BY 4.0 as declared by the supplied export. Original markings are retained. The 3D model represents the adapted plan above, not an exact reconstruction of the source image.</p></details>
        <details><summary>Other layouts checked</summary><div className="hc-table-wrap"><table><caption className="visually-hidden">Alternative layout family checks for the same brief</caption><thead><tr><th scope="col">Layout family</th><th scope="col">Area</th><th scope="col">Demo estimate</th><th scope="col">Checks</th></tr></thead><tbody>{house.alternatives.map((option)=><tr key={option.templateId}><th scope="row">{option.name}</th><td>{option.area.toFixed(1)} m²</td><td>{money(option.total)}</td><td>{option.fitsPlot?'Plot fits':'Plot conflict'} / {option.withinBudget?'Within budget':'Over budget'}</td></tr>)}</tbody></table></div><p>To explore a different family, refine your brief and change Preferred floor-plan arrangement.</p></details>
      </div>
    </section>

    {designConflicts.length > 0 && <section className="hc-conflicts" aria-label="Design conflicts" role="status">
      <Icon name="alert" /><div><h3>A few things need adjusting</h3>{designConflicts.map((conflict) => <p key={conflict}>{conflict}</p>)}
        <a href={editPath}>Review your requirements</a></div>
    </section>}
    {house.notes.length > 0 && <section className="hc-conflicts" aria-label="Design review notes"><Icon name="info" /><div><h3>Details to review</h3>{house.notes.map((note)=><p key={note}>{note}</p>)}</div></section>}

    <nav className="hc-section-nav" aria-label="Concept sections">
      <a href={`#${id}-details`}>The design</a><a href={`#${id}-costs`}>Cost & budget</a><a href={`#${id}-plot`}>Your plot</a><a href={`#${id}-downloads`}>Downloads</a>
    </nav>

    <div className="hc-detail-grid">
      <section className="hc-section" id={`${id}-details`} aria-labelledby={`${id}-details-title`}>
        <span className="hc-eyebrow">ROOM FOR THE WAY YOU LIVE</span><h3 id={`${id}-details-title`}>A closer look at your layout.</h3>
        <p>{house.layoutDescription} Your {house.spaceLevel.toLowerCase()} space preference controls room sizes independently of the selected finish quality.</p>
        <div className="hc-feature-chips"><span><Icon name="check" size={14} />{a.kitchen === 'Separate' ? 'Separate kitchen' : 'Open-plan living'}</span>
          <span><Icon name="check" size={14} />{house.circulationArea.toFixed(1)} m² circulation</span>
          {house.rooms.some((room) => room.type === 'office') && <span><Icon name="check" size={14} />Dedicated office</span>}
          {house.features.map((feature)=><span key={feature}><Icon name="check" size={14} />{feature}</span>)}
          <span><Icon name="check" size={14} />{house.roofDesign.replaceAll('-', ' ')}</span></div>
        <details className="hc-accordion"><summary>Room dimensions <span>{house.rooms.length} spaces</span></summary>
          <div className="hc-table-wrap"><table><caption className="visually-hidden">Generated room dimensions and areas</caption><thead><tr><th scope="col">Space</th>{house.floors&&<th scope="col">Floor</th>}<th scope="col">Dimensions</th><th scope="col">Area</th></tr></thead>
            <tbody>{house.rooms.map((room) => <tr key={room.id}><th scope="row">{room.name}</th>{house.floors&&<td>{house.floors[room.level].name}</td>}<td>{room.width.toFixed(1)} × {room.depth.toFixed(1)} m</td><td>{room.area.toFixed(1)} m²</td></tr>)}</tbody></table></div>
          <p className="hc-fine-print">Total floor area includes circulation across all levels and deducts upper stair openings. Wall thickness and terraces are excluded; this is an approximate pricing basis, not a surveyed gross building area. Ground footprint: {house.footprintArea.toFixed(1)} m².</p>
        </details>
        {recordedNeeds.length > 0 && <details className="hc-accordion"><summary>Needs recorded for further review</summary><p>These requests are saved in your brief. They have not been automatically resolved in this layout.</p>
          <dl className="hc-recorded-needs">{recordedNeeds.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>}
      </section>

      <section className="hc-section hc-cost-section" id={`${id}-costs`} aria-labelledby={`${id}-cost-title`}>
        <span className="hc-eyebrow">KNOW WHAT YOU ARE PLANNING FOR</span><h3 id={`${id}-cost-title`}>Your estimated construction cost.</h3>
        <p>{estimate
          ? `The estimated total of ${money(estimate.total)} includes the selected ${a.finish.toLowerCase()} finish level, catalogue and researched materials, plus allowances for other materials, labour, services, professional fees and contingency.`
          : priceDataState.error || 'Loading catalogue and researched material prices to calculate the estimate.'}</p>
        <p className="hc-fine-print">{estimate?.pricingNote || 'The illustrative estimate uses local catalogue prices and researched material benchmarks when available; the detailed breakdown is loading.'}</p>
        <details className="hc-accordion"><summary>Your stated budget inclusions</summary><p>{formatConsultationAnswer(a.budgetIncludes)}</p><p className="hc-fine-print">Recorded from your brief; these inclusions do not automatically change the quantities in the estimate.</p></details>
      </section>

      <section className="hc-section hc-plot-section" id={`${id}-plot`} aria-labelledby={`${id}-plot-title`}>
        <div className="hc-section-heading"><div><span className="hc-eyebrow">MADE TO MEET YOUR LAND</span><h3 id={`${id}-plot-title`}>How it sits on your plot.</h3></div>
          <span className={`hc-fit-badge ${house.fitsPlot ? '' : 'hc-fit-badge--over'}`}><Icon name={house.fitsPlot ? 'check' : 'alert'} size={15} />{house.fitsPlot ? 'Fits demo envelope' : 'Needs a larger envelope'}</span></div>
        <dl className="hc-plot-facts"><div><dt>Your plot</dt><dd>{a.width} × {a.length} m</dd></div><div><dt>House footprint</dt><dd>{house.width.toFixed(1)} × {house.length.toFixed(1)} m</dd></div>
          <div><dt>Road access</dt><dd>{a.access === 'Unknown' ? 'Not specified' : a.access}</dd></div><div><dt>Boundary allowance</dt><dd>1 m each side</dd></div></dl>
        <p className="hc-fine-print">Plot fit assumes a flat, rectangular site and uses your road-access orientation with demo boundary allowances. Site shape and slope are not assessed. Local setbacks, coverage rules, services and ground conditions still need checking.</p>
      </section>
    </div>

    <section className="hc-downloads" id={`${id}-downloads`} aria-labelledby={`${id}-download-title`}>
      <div><span className="hc-eyebrow">THE NEXT CHAPTER STARTS HERE</span><h3 id={`${id}-download-title`}>Take your concept with you.</h3><p>Keep the floor plan and design details for your next conversation.</p></div>
      <div className="hc-download-actions"><Button onClick={()=>downloadPlan()} icon="grid">{activeFloor?activeFloor.name:'Floor plan'} · SVG</Button>{house.floors&&<Button variant="secondary" onClick={()=>downloadPlan(true)} icon="grid">All floors · SVG</Button>}<Button variant="secondary" onClick={downloadConcept} icon="layers">Concept details · JSON</Button></div>
      {downloadError && <p className="hc-download-error" role="alert">{downloadError}</p>}
    </section>
    <footer className="hc-footer"><Icon name="info" size={17} /><p>This concept reflects confirmed brief v{brief.version}. Edit your brief and confirm again to revise the house. Drawings, furniture and materials are indicative; detailed engineering, accessibility and construction approval require professional review.</p></footer>
    <Modal open={planOpen} onClose={()=>setPlanOpen(false)} title="Your floor plan" wide labelledBy={`${id}-large-plan`}>
      <div className="hc-large-plan"><p>{activeFloor?.name||'Floor plan'} · {(activeFloor?.area||house.footprintArea).toFixed(1)} m²</p><FloorPlan house={house} floorId={activeFloor?.id} /></div>
    </Modal>
  </article>;
}
