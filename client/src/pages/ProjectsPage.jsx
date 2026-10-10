import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Icon } from '../components/ui/Icon';
import { PrototypeConcept } from './PrototypeConcept';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const DESCRIPTIONS = [
  'Start with the land. Its dimensions help shape what your home can become.',
  'Tell us who the home is for and what you want to spend.',
  'A good home fits your routines. Let us get to know yours.',
  'Choose the details that make this home feel like you.',
];
const visible = (q, a) => !q.when || a[q.when.key] === q.when.value;

function Notice({ children, type = 'error' }) {
  return <div className={`studio-notice studio-notice--${type}`} role={type === 'error' ? 'alert' : 'status'}><Icon name={type === 'error' ? 'alert' : 'check'} /><span>{children}</span></div>;
}

export function ProjectsPage() {
  useDocumentTitle('My projects');
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    api.get('/projects', { signal: controller.signal }).then(({ data }) => setProjects(data.items))
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  async function create(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { const { data } = await api.post('/projects', { title: title.trim() }); navigate(`/projects/${data.id}`); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="studio">
    <section className="studio-welcome studio-welcome--compact">
      <div><span className="studio-eyebrow">YOUR HOME, YOUR WAY</span><h1>Your home projects.</h1><p>From your first ideas to a house concept. Tell us about your land, your budget, and the way you live.</p>
        <div className="studio-journey"><span><Icon name="edit" /> Share your brief</span><span><Icon name="layers" /> Explore a concept</span><span><Icon name="coins" /> See the estimate</span></div>
      </div>

    </section>
    {error && <><Notice>{error}</Notice><Button variant="secondary" onClick={() => setRetry((n) => n + 1)}>Try again</Button></>}
    <div className="studio-dashboard">
      <section className="studio-panel studio-create"><span className="studio-eyebrow">START SOMETHING NEW</span><h2>Let us plan your home.</h2><p>A short consultation helps us understand what matters to you. You can save your progress at any time.</p><form onSubmit={create}><FormField label="Project name" placeholder="e.g. Our family home" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} /><Button type="submit" loading={busy} disabled={!title.trim()} icon="arrowRight" block>Start my consultation</Button></form><small><Icon name="info" size={14} /> No account needed. Projects are saved in this browser.</small></section>
      <section className="studio-projects"><div className="studio-section-title"><h2>Your projects</h2><span className="studio-count">{projects.length}</span></div>
        {loading ? <div className="studio-empty" role="status"><Icon name="refresh" size={28} /><p>Loading your projects...</p></div> : projects.length ? <div className="studio-project-list">{projects.map((p) => <Link className="studio-project" key={p.id} to={`/projects/${p.id}`}><span className="studio-project-icon"><Icon name="house" size={24} /></span><span><strong>{p.title}</strong><small>Created {new Date(p.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} / Continue consultation</small></span><Icon name="arrowRight" /></Link>)}</div> : <div className="studio-empty"><Icon name="house" size={32} /><h3>Your next chapter starts here.</h3><p>Name your project to begin. Your saved consultations will appear here.</p></div>}
      </section>
    </div>
  </div>;
}

export function ConsultationPage() {
  useDocumentTitle('Architectural consultation');
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [config, setConfig] = useState(null);
  const [project, setProject] = useState(null);
  const [answers, setAnswers] = useState({});
  const [revision, setRevision] = useState(0);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [brief, setBrief] = useState(null);
  const [retry, setRetry] = useState(0);
  const heading = useRef(null);
  const workspaceHeading = useRef(null);
  const mode = params.get('mode') === 'brief' || !brief ? 'brief' : 'design';
  useEffect(() => { window.scrollTo({ top: 0 }); workspaceHeading.current?.focus({ preventScroll: true }); }, [mode]);
  useEffect(() => {
    const controller = new AbortController();
    setError(''); setConfig(null);
    Promise.all([api.get('/consultation/config', { signal: controller.signal }), api.get(`/projects/${id}`, { signal: controller.signal })]).then(([c, p]) => {
      if (controller.signal.aborted) return;
      setConfig(c.data); setProject(p.data.project); setAnswers(p.data.draft.answers); setRevision(p.data.draft.revision); setBrief(p.data.briefs[0] || null); setDirty(false);
      const firstIncomplete = c.data.steps.findIndex((s) => s.questions.some((q) => visible(q, p.data.draft.answers) && q.required && (p.data.draft.answers[q.key] === undefined || p.data.draft.answers[q.key] === '')));
      const resume = firstIncomplete < 0 ? c.data.steps.length : firstIncomplete;
      setStep(resume); setFurthest(resume);
    }).catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [id, retry]);
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function save(confirm = false, advance = false) {
    setBusy(true); setError(''); setMessage(''); setFields({});
    try {
      const { data } = await api.put(`/projects/${id}/consultation`, { expectedRevision: revision, answers });
      setRevision(data.revision); setDirty(false);
      if (confirm) {
        const result = await api.post(`/projects/${id}/briefs`, { draftRevision: data.revision, acknowledged });
        setBrief(result.data); setMessage('Your brief is confirmed. Your concept is ready to explore.');
        setParams({ mode: 'design' }, { replace: true });
      } else { setMessage('Progress saved.'); if (advance) { setFurthest((n) => Math.max(n, step + 1)); setStep((s) => s + 1); } }
    } catch (e) {
      setError(e.message);
      const fieldErrors = Object.fromEntries(Object.entries(e.fields || {}).map(([key, value]) => [key.replace(/^answers\./, ''), value]));
      setFields(fieldErrors);
      const key = Object.keys(fieldErrors)[0];
      const index = config.steps.findIndex((s) => s.questions.some((q) => q.key === key));
      if (index >= 0) setStep(index);
      if (e.status === 409) setError('This project was updated elsewhere. Reload the page to get the latest saved answers before trying again.');
    } finally { setBusy(false); }
  }
  function change(q, value) {
    setAnswers((a) => { const next = { ...a }; if (value === '') delete next[q.key]; else next[q.key] = q.type === 'number' ? Number(value) : value; return next; });
    setDirty(true); setAcknowledged(false); setMessage(''); setFields((f) => ({ ...f, [q.key]: undefined }));
  }
  if (!config || !project) return <div className="studio studio-panel studio-empty"><Icon name={error ? 'alert' : 'refresh'} size={32} /><h1>{error ? 'Open your saved workspace.' : 'Opening your project...'}</h1><p role={error ? 'alert' : 'status'}>{error || 'Loading your saved consultation.'}</p>{error && <Button onClick={() => setRetry((n) => n + 1)}>Try again</Button>}<Link to="/">Back to projects</Link></div>;
  const review = step === config.steps.length;
  const titles = [...config.steps.map((s) => s.title), 'Review brief'];
  return <div className={`studio project-workspace ${mode === 'design' ? 'project-workspace--design' : ''}`}>
    <Link className="studio-back" to="/" onClick={(e) => { if (dirty && !window.confirm('Leave without saving your latest changes?')) e.preventDefault(); }}><Icon name="arrowLeft" size={16} /> All projects</Link>
    <div className="studio-page-heading"><div><span className="studio-eyebrow">{mode === 'design' ? 'YOUR HOUSE WORKSPACE' : 'ARCHITECTURAL CONSULTATION'}</span><h1 ref={workspaceHeading} tabIndex={-1}>{project.title}</h1></div><span className={`studio-save-state ${dirty ? 'is-unsaved' : ''}`}><span />{mode === 'design' ? `Concept version ${brief?.version}` : dirty ? 'Unsaved changes' : 'Progress saved'}</span></div>
    <div className="project-workspace-tabs" aria-label="Project workspace"><button type="button" aria-pressed={mode === 'design'} disabled={!brief} onClick={() => setParams({ mode: 'design' })}><Icon name="house" size={17} /> Your house</button><button type="button" aria-pressed={mode === 'brief'} onClick={() => setParams({ mode: 'brief' })}><Icon name="edit" size={17} /> {brief ? 'Edit brief' : 'Create brief'}</button><span>{mode === 'design' ? 'Explore your design or edit your brief to make changes.' : 'One section at a time. Your design is a click away.'}</span></div>
    {mode === 'brief' && <div className="consultation-layout"><aside className="consultation-sidebar"><ol className="consultation-steps">{titles.map((title, i) => <li key={title} aria-current={i === step ? 'step' : undefined}><button type="button" disabled={i > furthest || busy} onClick={() => { setStep(i); setError(''); }}><span className="consultation-step-number">{i < step ? <Icon name="check" size={16} /> : i + 1}</span><span>{title}<small>{i === step ? 'In progress' : i <= furthest ? 'Available to review' : 'Up next'}</small></span></button></li>)}</ol><div className="consultation-tip"><Icon name="info" /><h3>Designed around you</h3><p>Your answers shape the concept. Use Save draft whenever you want to pause.</p></div></aside>
    <div><form className="studio-panel consultation-form" onSubmit={(e) => { e.preventDefault(); save(review, !review); }}>
      <span className="studio-eyebrow">STEP {step + 1} OF {titles.length}</span><h2 ref={heading} tabIndex={-1}>{review ? 'Does this feel like your home?' : config.steps[step].title}</h2><p className="consultation-intro">{review ? 'Review your answers before creating a concept. You can go back and edit any section.' : DESCRIPTIONS[step]}</p>
      <progress className="consultation-progress" value={step + 1} max={titles.length} aria-label="Consultation progress" />
      {error && <Notice>{error}</Notice>}{message && <Notice type="success">{message}</Notice>}
      {!review ? <div className="consultation-fields">{config.steps[step].questions.filter((q) => visible(q, answers)).map((q) => <div key={q.key} className={q.type === 'textarea' ? 'field-span' : ''}><FormField label={q.label} hint={q.hint} error={fields[q.key]} required={q.required} optional={!q.required} as={q.options ? 'select' : q.type === 'textarea' ? 'textarea' : 'input'} type={q.type === 'number' ? 'number' : 'text'} min={q.min} max={q.max} maxLength={q.type === 'number' ? undefined : 2000} rows={3} step={q.key === 'width' || q.key === 'length' ? 'any' : 1} value={answers[q.key] ?? ''} onChange={(e) => change(q, e.target.value)}>{q.options && <><option value="">Choose an option</option>{q.options.map((o) => <option key={o}>{o}</option>)}</>}</FormField></div>)}</div> : <><div className="brief-summary"><span><strong>{answers.width} x {answers.length} m</strong>Plot dimensions</span><span><strong>{answers.bedrooms} bed / {answers.bathrooms} bath</strong>Required rooms</span><span><strong>{Number(answers.budget || 0).toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 })}</strong>Budget</span><span><strong>{answers.style}</strong>Architectural style</span></div><div className="brief-review">{config.steps.map((s, i) => <details key={s.title}><summary>{s.title}<span>View answers</span></summary><Button size="sm" variant="ghost" onClick={() => setStep(i)}>Edit this section</Button><dl>{s.questions.filter((q) => visible(q, answers) && answers[q.key] !== undefined).map((q) => <div key={q.key}><dt>{q.label}</dt><dd>{answers[q.key]}</dd></div>)}</dl></details>)}</div><div className="consultation-assumptions"><h3>About your concept</h3><p>We currently support flat, rectangular plots and single-storey homes. Special access needs and future extensions are recorded for review. Layouts and costs are illustrative.</p></div><label className="consultation-ack"><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} required /><span>These answers reflect my needs. I understand this is an early house concept.</span></label></>}
      <div className="consultation-actions"><Button variant="ghost" disabled={step === 0 || busy} icon="arrowLeft" onClick={() => setStep(step - 1)}>Back</Button><div><Button variant="secondary" disabled={busy} onClick={() => save()}>Save draft</Button><Button type="submit" loading={busy} icon="arrowRight">{review ? 'Create my concept' : 'Save & continue'}</Button></div></div>
    </form>
    <div className="consultation-footnote"><Icon name="info" size={14} /> Saved on this device / Your answers can be revisited later.</div></div></div>}
    {mode === 'design' && brief && <div className="concept-anchor">{(dirty || brief.draft_revision !== revision) && <Notice type="info">This concept uses your last confirmed brief. Edit and confirm your brief to update it.</Notice>}<PrototypeConcept brief={brief} /></div>}
  </div>;
}
