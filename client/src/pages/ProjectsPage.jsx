import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Icon } from '../components/ui/Icon';
import { PrototypeConcept } from './PrototypeConcept';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';
import { ConsultationQuestion } from '../components/forms/ConsultationQuestion';
import { ConsultationReview, ConsultationScopeNotice } from '../components/forms/ConsultationReview';
import { consultationProgress, questionVisible, siteScopeErrors, validateConsultation } from '../utils/consultation';
import '../styles/consultation.css';

const DESCRIPTIONS = [
  'Start with the land. Its dimensions help shape what your home can become.',
  'Tell us who the home is for and what you want to spend.',
  'A good home fits your routines. Let us get to know yours.',
  'Choose the details that make this home feel like you.',
];
const visible = questionVisible;

function normalizeAnswers(steps, answers) {
  const normalized = { ...answers };
  const budgetQuestion = steps.flatMap((step) => step.questions).find((question) => question.key === 'budgetIncludes');
  if (typeof normalized.budgetIncludes === 'string' && Array.isArray(budgetQuestion?.options)) {
    const previousAnswer = normalized.budgetIncludes.toLowerCase();
    normalized.budgetIncludes = budgetQuestion.options.filter((option) => previousAnswer.includes(option.toLowerCase()));
  }
  return normalized;
}

function Notice({ children, type = 'error' }) {
  return <div className={`studio-notice studio-notice--${type}`} role={type === 'error' ? 'alert' : 'status'}><Icon name={type === 'error' ? 'alert' : 'check'} /><span>{children}</span></div>;
}

export function ProjectsPage() {
  const { cloudMode } = useAuth();
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
      <section className="studio-panel studio-create"><span className="studio-eyebrow">START SOMETHING NEW</span><h2>Let us plan your home.</h2><p>A short consultation helps us understand what matters to you. You can save your progress at any time.</p><form onSubmit={create}><FormField label="Project name" placeholder="e.g. Our family home" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} /><Button type="submit" loading={busy} disabled={!title.trim()} icon="arrowRight" block>Start my consultation</Button></form><small><Icon name="info" size={14} /> {cloudMode ? 'Projects and briefs are saved to your account. Log in on another device to continue.' : 'Local demo: projects are saved in this browser.'}</small></section>
      <section className="studio-projects"><div className="studio-section-title"><h2>Your projects</h2><span className="studio-count">{projects.length}</span></div>
        {loading ? <div className="studio-empty" role="status"><Icon name="refresh" size={28} /><p>Loading your projects...</p></div> : projects.length ? <div className="studio-project-list">{projects.map((p) => <Link className="studio-project" key={p.id} to={`/projects/${p.id}`}><span className="studio-project-icon"><Icon name="house" size={24} /></span><span><strong>{p.title}</strong><small>Created {new Date(p.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} / Continue consultation</small></span><Icon name="arrowRight" /></Link>)}</div> : <div className="studio-empty"><Icon name="house" size={32} /><h3>Your next chapter starts here.</h3><p>Name your project to begin. Your saved consultations will appear here.</p></div>}
      </section>
    </div>
  </div>;
}

export function ConsultationPage() {
  const { cloudMode } = useAuth();
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
  const formRef = useRef(null);
  const shouldFocusError = useRef(false);
  const workspaceHeading = useRef(null);
  const mode = params.get('mode') === 'brief' || !brief ? 'brief' : 'design';
  useEffect(() => { window.scrollTo({ top: 0 }); workspaceHeading.current?.focus({ preventScroll: true }); }, [mode]);
  useEffect(() => {
    const controller = new AbortController();
    setError(''); setConfig(null);
    Promise.all([api.get('/consultation/config', { signal: controller.signal }), api.get(`/projects/${id}`, { signal: controller.signal })]).then(([c, p]) => {
      if (controller.signal.aborted) return;
      const draftAnswers = normalizeAnswers(c.data.steps, p.data.draft.answers);
      setConfig(c.data); setProject(p.data.project); setAnswers(draftAnswers); setRevision(p.data.draft.revision); setBrief(p.data.briefs[0] || null); setDirty(false);
      const draftErrors = validateConsultation(c.data.steps, draftAnswers, { complete: true });
      const firstIncomplete = c.data.steps.findIndex((section) => section.questions.some((q) => draftErrors[q.key]));
      const resume = firstIncomplete < 0 ? c.data.steps.length : firstIncomplete;
      setStep(resume); setFurthest(resume);
    }).catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [id, retry]);
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (!shouldFocusError.current || !Object.keys(fields).length) return undefined;
    shouldFocusError.current = false;
    const frame = requestAnimationFrame(() => formRef.current?.querySelector('fieldset[aria-invalid="true"] input, input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [fields]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function save(confirm = false, advance = false) {
    if (busy) return;
    const checkedSteps = advance ? [config.steps[step]] : config.steps;
    const errors = validateConsultation(checkedSteps, answers, { complete: confirm || advance });
    if (confirm) Object.assign(errors, siteScopeErrors(answers));
    if (Object.keys(errors).length) {
      shouldFocusError.current = true;
      setFields(errors); setError('Please check the highlighted answers. Your changes are still here.'); setMessage('');
      const first = config.steps.findIndex((section) => section.questions.some((q) => errors[q.key]));
      if (first >= 0) setStep(first);
      return;
    }
    if (confirm && !acknowledged) { setError('Please review and acknowledge your brief before creating the concept.'); return; }
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
      shouldFocusError.current = true;
      setFields(fieldErrors);
      const key = Object.keys(fieldErrors)[0];
      const index = config.steps.findIndex((s) => s.questions.some((q) => q.key === key));
      if (index >= 0) setStep(index);
      if (e.status === 409) setError('This project was updated elsewhere. Reload the page to get the latest saved answers before trying again.');
    } finally { setBusy(false); }
  }
  function change(q, value) {
    setAnswers((a) => { const next = { ...a }; if (value === '') delete next[q.key]; else next[q.key] = q.type === 'number' ? Number(value) : value; return next; });
    setDirty(true); setAcknowledged(false); setMessage(''); setError(''); setFields((f) => ({ ...f, [q.key]: undefined }));
  }
  if (!config || !project) return <div className="studio studio-panel studio-empty"><Icon name={error ? 'alert' : 'refresh'} size={32} /><h1>{error ? 'Open your saved workspace.' : 'Opening your project...'}</h1><p role={error ? 'alert' : 'status'}>{error || 'Loading your saved consultation.'}</p>{error && <Button onClick={() => setRetry((n) => n + 1)}>Try again</Button>}<Link to="/">Back to projects</Link></div>;
  const review = step === config.steps.length;
  const titles = [...config.steps.map((s) => s.title), 'Review brief'];
  const progress = consultationProgress(config.steps, answers);
  return <div className={`studio project-workspace ${mode === 'design' ? 'project-workspace--design' : ''}`}>
    <Link className="studio-back" to="/" onClick={(e) => { if (dirty && !window.confirm('Leave without saving your latest changes?')) e.preventDefault(); }}><Icon name="arrowLeft" size={16} /> All projects</Link>
    <div className="studio-page-heading"><div><span className="studio-eyebrow">{mode === 'design' ? 'YOUR HOUSE WORKSPACE' : 'ARCHITECTURAL CONSULTATION'}</span><h1 ref={workspaceHeading} tabIndex={-1}>{project.title}</h1></div><span className={`studio-save-state ${dirty ? 'is-unsaved' : ''}`}><span />{mode === 'design' ? `Concept version ${brief?.version}` : dirty ? 'Unsaved changes' : 'Progress saved'}</span></div>
    <div className="project-workspace-tabs" aria-label="Project workspace"><button type="button" aria-pressed={mode === 'design'} disabled={!brief} onClick={() => setParams({ mode: 'design' })}><Icon name="house" size={17} /> Your house</button><button type="button" aria-pressed={mode === 'brief'} onClick={() => setParams({ mode: 'brief' })}><Icon name="edit" size={17} /> {brief ? 'Edit brief' : 'Create brief'}</button><span>{mode === 'design' ? 'Explore your design or edit your brief to make changes.' : 'One section at a time. Your design is a click away.'}</span></div>
    {mode === 'brief' && <div className="consultation-layout"><aside className="consultation-sidebar"><ol className="consultation-steps">{titles.map((title, i) => {
      const section = progress.sections[i];
      const complete = section ? section.complete : acknowledged;
      return <li key={title} aria-current={i === step ? 'step' : undefined}><button type="button" disabled={i > furthest || busy} onClick={() => { setStep(i); setError(''); }}><span className="consultation-step-number">{complete ? <Icon name="check" size={16} /> : i + 1}</span><span>{title}<small>{section ? `${section.answered} of ${section.total} required` : 'Check and confirm'}</small></span></button></li>;
    })}</ol><div className="consultation-tip"><Icon name="info" /><h3>One section at a time</h3><p>Required answers help us create your concept. Optional details are saved for review. Save draft lets you pause with unanswered questions.</p></div></aside>
    <div><form ref={formRef} noValidate className="studio-panel consultation-form" onSubmit={(e) => { e.preventDefault(); save(review, !review); }}>
      <span className="studio-eyebrow">STEP {step + 1} OF {titles.length}</span><h2 ref={heading} tabIndex={-1}>{review ? 'Does this feel like your home?' : config.steps[step].title}</h2><p className="consultation-intro">{review ? 'Review your answers before creating a concept. You can go back and edit any section.' : DESCRIPTIONS[step]}</p>
      <div className="consultation-completion"><span>{progress.answered} of {progress.total} required answers ready</span><span>{Math.round(progress.answered / Math.max(1, progress.total) * 100)}%</span></div>
      <progress className="consultation-progress" value={progress.answered} max={Math.max(1, progress.total)} aria-label="Required answers completed" />
      {error && <Notice>{error}</Notice>}{message && <Notice type="success">{message}</Notice>}
      {!review ? <>
        {step === 0 && <ConsultationScopeNotice answers={answers} />}
        <div className="consultation-fields">{config.steps[step].questions.filter((q) => visible(q, answers)).map((question) =>
          <ConsultationQuestion key={question.key} question={question} value={answers[question.key]} error={fields[question.key]} disabled={busy} onChange={(value) => change(question, value)} />
        )}</div>
      </> : <>
        <ConsultationReview config={config} answers={answers} busy={busy} onEdit={setStep} />
        <label className="consultation-ack"><input type="checkbox" checked={acknowledged} disabled={busy} onChange={(e) => { setAcknowledged(e.target.checked); setError(''); }} /><span>These answers reflect my needs. I understand which requests are generated and which need further review.</span></label>
      </>}
      <div className="consultation-actions"><Button variant="ghost" disabled={step === 0 || busy} icon="arrowLeft" onClick={() => setStep(step - 1)}>Back</Button><div><Button variant="secondary" disabled={busy} onClick={() => save()}>Save draft</Button><Button type="submit" loading={busy} icon="arrowRight">{review ? 'Confirm brief & create concept' : 'Save & continue'}</Button></div></div>
    </form>
    <div className="consultation-footnote"><Icon name="info" size={14} /> {cloudMode ? 'Saved to your account / Log in to revisit your answers later.' : 'Saved on this device / Your answers can be revisited later.'}</div></div></div>}
    {mode === 'design' && brief && <div className="concept-anchor">{(dirty || brief.draft_revision !== revision) && <Notice type="info">This concept uses your last confirmed brief. Edit and confirm your brief to update it.</Notice>}<PrototypeConcept brief={brief} /></div>}
  </div>;
}
