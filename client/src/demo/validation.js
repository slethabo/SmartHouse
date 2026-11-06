import questionnaire from './consultation.json';

function fail(message, status = 400, fields = {}) {
  const error = new Error(message);
  error.status = status; error.fields = fields;
  throw error;
}
export function validateAnswers(answers, complete = false) {
  const errors = {};
  for (const q of questionnaire.steps.flatMap((s) => s.questions)) {
    if (q.when && answers[q.when.key] !== q.when.value) continue;
    const value = answers[q.key];
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) { if (complete && q.required) errors[q.key] = 'Please answer this question.'; continue; }
    if (q.type === 'number' && (!Number.isFinite(value) || value < q.min || value > q.max || (!['width', 'length'].includes(q.key) && !Number.isInteger(value)))) errors[q.key] = `Enter a number from ${q.min} to ${q.max}.`;
    if (q.type === 'multiselect' && (!Array.isArray(value) || value.some((option) => !q.options.includes(option)))) errors[q.key] = 'Choose available options.';
    else if (q.options && q.type !== 'multiselect' && !q.options.includes(value)) errors[q.key] = 'Choose an available option.';
    if (typeof value === 'string' && value.length > 2000) errors[q.key] = 'Keep this answer under 2,000 characters.';
  }
  if (Object.keys(errors).length) fail('Please check the highlighted answers.', 400, errors);
}
