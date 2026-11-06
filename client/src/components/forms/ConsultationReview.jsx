import { useMemo } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { createHouseConcept } from '../../demo/layout';
import { formatConsultationAnswer, questionVisible, validateConsultation } from '../../utils/consultation';

const money = (value) => Number(value).toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 });

export function ConsultationReview({ config, answers, onEdit, busy }) {
  const preview = useMemo(() => {
    if (Object.keys(validateConsultation(config.steps, answers, { complete: true })).length) return null;
    return createHouseConcept(answers);
  }, [config.steps, answers]);
  return <>
    <div className="brief-summary"><span><strong>{answers.width} × {answers.length} m</strong>Plot dimensions</span>
      <span><strong>{answers.bedrooms} bed / {answers.bathrooms} bath</strong>Required rooms</span>
      <span><strong>{money(answers.budget || 0)}</strong>Your construction budget</span>
      <span><strong>{answers.style || 'Not selected'}</strong>Architectural style</span></div>
    {preview && <section className={`consultation-readiness ${preview.conflicts.length ? 'consultation-readiness--warning' : ''}`} aria-label="Initial design checks">
      <Icon name={preview.conflicts.length ? 'alert' : 'check'} size={19} /><div>
        <strong>{preview.conflicts.length ? 'Your selected layout needs adjustment' : 'Your brief is ready to explore'}</strong>
        <p>{preview.template.name} · {preview.spaceLevel} room sizes · adapted from dataset plan {preview.template.sourceId}.</p>
        <p>Initial check: {preview.storeys||1} {(preview.storeys||1)>1?'storeys':'storey'} · {preview.totalFloorArea.toFixed(1)} m² total floor area · {preview.footprintArea.toFixed(1)} m² ground footprint. Demo estimate {money(preview.total)}{preview.storeys>1?', including separate stair and upper-structure allowances':''}.</p>
        {preview.conflicts.map((conflict) => <p key={conflict}>{conflict}</p>)}
        {preview.notes.map((note) => <p key={note}>{note}</p>)}
        {preview.conflicts.length > 0 && <p>You can revise the brief or create the concept with these conflicts clearly flagged.</p>}
      </div>
    </section>}
    <section className="consultation-support-summary" aria-label="How your answers will be used"><h3>What your answers will shape</h3>
      <p>Room counts, room sizes, layout family, kitchen arrangement, a dedicated office and selected additional spaces affect the generated house. Three reviewed dataset plans supply the layout families. Finish quality changes the area rate independently of room sizes and features.</p>
      <p><strong>Saved for review:</strong> household size, guest notes, privacy preferences, accessibility, budget inclusions and other free-text requests do not automatically create rooms. Use the additional-space checkboxes for the features currently supported by the generator.</p>
    </section>
    <div className="brief-review">{config.steps.map((section, index) => <details key={section.title}>
      <summary>{section.title}<span>Review answers</span></summary>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => onEdit(index)}>Edit this section</Button>
      <dl>{section.questions.filter((q) => questionVisible(q, answers)).map((question) => <div key={question.key}>
        <dt>{question.label}</dt><dd>{formatConsultationAnswer(answers[question.key])}</dd>
      </div>)}</dl>
    </details>)}</div>
    <div className="consultation-assumptions"><h3>Before you create the concept</h3>
      <p>The generator assumes a flat, rectangular plot and supports one to three storeys, with demo 1 m boundary allowances. Site shape and slope are not assessed. Multi-storey arrangements are authored concepts with stairs and aligned service zones; engineering, fire escape and accessibility still require professional review. Costs are illustrative. Confirming your brief starts a design exploration; it does not approve construction.</p>
    </div>
  </>;
}
