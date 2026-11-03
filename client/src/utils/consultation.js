/** Shared questionnaire rules for step navigation, review and the local adapter. */
export const questionVisible = (question, answers) => !question.when || answers[question.when.key] === question.when.value;
export const hasAnswer = (value) => value !== undefined && value !== null
  && (typeof value !== 'string' || value.trim().length > 0)
  && (!Array.isArray(value) || value.length > 0);

export function validateConsultation(steps, answers, { complete = false } = {}) {
  const errors = {};
  for (const question of steps.flatMap((step) => step.questions)) {
    if (!questionVisible(question, answers)) continue;
    const value = answers[question.key];
    if (!hasAnswer(value)) {
      if (complete && question.required) errors[question.key] = question.type === 'multiselect'
        ? 'Select at least one option.' : 'Please answer this question.';
      continue;
    }
    if (question.type === 'number') {
      const integer = !['width', 'length'].includes(question.key);
      if (!Number.isFinite(value) || value < question.min || value > question.max || (integer && !Number.isInteger(value))) {
        errors[question.key] = `Enter ${integer ? 'a whole number' : 'a number'} from ${question.min} to ${question.max}.`;
      }
    } else if (question.type === 'multiselect') {
      if (!Array.isArray(value) || value.some((option) => !question.options.includes(option)) || new Set(value).size !== value.length) {
        errors[question.key] = 'Select each available option at most once.';
      }
    } else if (question.options) {
      if (!question.options.includes(value)) errors[question.key] = 'Choose an available option.';
    } else if (typeof value !== 'string') {
      errors[question.key] = 'Enter a text answer.';
    }
    if (typeof value === 'string' && value.length > 2000) errors[question.key] = 'Keep this answer under 2,000 characters.';
  }
  return errors;
}

export function consultationProgress(steps, answers) {
  const required = steps.flatMap((step) => step.questions).filter((q) => q.required && questionVisible(q, answers));
  const errors = validateConsultation(steps, answers, { complete: true });
  return {
    answered: required.filter((q) => hasAnswer(answers[q.key]) && !errors[q.key]).length,
    total: required.length,
    sections: steps.map((step) => {
      const questions = step.questions.filter((q) => q.required && questionVisible(q, answers));
      const answered = questions.filter((q) => hasAnswer(answers[q.key]) && !errors[q.key]).length;
      return { answered, total: questions.length, complete: Object.keys(validateConsultation([step], answers, { complete: true })).length === 0 };
    }),
  };
}

export function siteScopeErrors(answers) {
  const errors = {};
  if (answers.shape && answers.shape !== 'Rectangular') errors.shape = 'This plot shape is outside the current generator’s scope. Save your brief for further design review.';
  if (answers.terrain === 'Sloped') errors.terrain = 'Sloped sites need further design review. You can save your brief, but a house cannot be generated for this site yet.';
  return errors;
}

const LAYOUT_KEYS = ['bedrooms', 'bathrooms', 'kitchen', 'style', 'roofForm', 'spaceLevel', 'homeFeatures', 'layoutPreference'];
const SITE_KEYS = ['width', 'length', 'access', 'shape', 'terrain'];
export function questionImpact(question) {
  if (LAYOUT_KEYS.includes(question.key)) return { kind: 'layout', label: 'Shapes your concept' };
  if (SITE_KEYS.includes(question.key)) return { kind: 'site', label: 'Checks your plot' };
  if (question.key === 'budget') return { kind: 'cost', label: 'Checks your budget' };
  if (question.key === 'finish') return { kind: 'cost', label: 'Sets your demo estimate' };
  if (['workFromHome', 'office'].includes(question.key)) return { kind: 'layout', label: 'Can add a dedicated office' };
  return { kind: 'recorded', label: 'Recorded for review' };
}

export function formatConsultationAnswer(value) {
  if (!hasAnswer(value)) return 'Not provided';
  return Array.isArray(value) ? value.join(', ') : String(value);
}
