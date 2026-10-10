const { z } = require('zod');
const { badRequest } = require('../../utils/errors');

const steps = [
  { title: 'Your land', questions: [
    { key: 'location', label: 'Where will you build?', type: 'text', required: true },
    { key: 'width', label: 'Plot width (metres)', type: 'number', min: 5, max: 200, required: true },
    { key: 'length', label: 'Plot length (metres)', type: 'number', min: 5, max: 200, required: true },
    { key: 'shape', label: 'What shape is the plot?', options: ['Rectangular', 'Other'], required: true },
    { key: 'terrain', label: 'Is the land flat or sloped?', options: ['Flat', 'Sloped', 'Unknown'], required: true },
    { key: 'access', label: 'Which edge has road access?', options: ['North', 'South', 'East', 'West', 'Unknown'], required: true },
  ] },
  { title: 'Budget and household', questions: [
    { key: 'budget', label: 'Construction budget (ZAR)', type: 'number', min: 1, max: 100000000, required: true },
    { key: 'finish', label: 'Preferred finishes', options: ['Basic', 'Standard', 'Premium'], required: true },
    { key: 'budgetIncludes', label: 'What does your budget include?', type: 'textarea', required: true, hint: 'Include your expectations for labour, fees, site preparation, landscaping, and contingency.' },
    { key: 'occupants', label: 'How many people will live here?', type: 'number', min: 1, max: 30, required: true },
    { key: 'bedrooms', label: 'Essential bedrooms', type: 'number', min: 1, max: 6, required: true },
    { key: 'bathrooms', label: 'Essential bathrooms', type: 'number', min: 1, max: 4, required: true },
  ] },
  { title: 'Daily life', questions: [
    { key: 'workFromHome', label: 'Do you work from home?', options: ['Yes', 'No'], required: true },
    { key: 'office', label: 'What workspace do you need?', options: ['Dedicated quiet office', 'Shared workspace'], when: { key: 'workFromHome', value: 'Yes' }, required: true },
    { key: 'guests', label: 'How often do you host overnight guests?', options: ['Rarely', 'Sometimes', 'Often'], required: true },
    { key: 'guestNeeds', label: 'What accommodation would guests need?', type: 'textarea', when: { key: 'guests', value: 'Often' }, required: true },
    { key: 'kitchen', label: 'Kitchen arrangement', options: ['Open plan', 'Separate'], required: true },
    { key: 'storage', label: 'Storage, laundry, pantry, and outdoor needs', type: 'textarea' },
  ] },
  { title: 'Style and priorities', questions: [
    { key: 'style', label: 'Preferred architectural style', options: ['Modern', 'Traditional', 'Minimalist'], required: true },
    { key: 'privacy', label: 'Bedroom privacy', options: ['Separate from entertaining spaces', 'No preference'], required: true },
    { key: 'accessibility', label: 'Accessibility needs', options: ['None stated', 'Step-free access', 'Other needs'], required: true },
    { key: 'accessibilityNotes', label: 'Describe the access requirements', type: 'textarea', when: { key: 'accessibility', value: 'Other needs' }, required: true },
    { key: 'essentials', label: 'Other essential features', type: 'textarea', hint: 'These will be recorded for review; automatic support has not yet been implemented.' },
    { key: 'optionalFeatures', label: 'Which features could change to meet the budget?', type: 'textarea' },
    { key: 'futurePlans', label: 'Future extensions or household changes', type: 'textarea' },
  ] },
];
const questions = steps.flatMap((step) => step.questions);
const active = (q, answers) => !q.when || answers[q.when.key] === q.when.value;
const fields = Object.fromEntries(questions.map((q) => [q.key, q.type === 'number'
  ? z.number().finite().min(q.min).max(q.max).int().optional()
  : q.options ? z.enum(q.options).optional() : z.string().trim().max(2000).optional()]));
// Plot dimensions can include decimal metres.
fields.width = z.number().finite().min(5).max(200).optional();
fields.length = z.number().finite().min(5).max(200).optional();
const answerSchema = z.object(fields).strict();
function buildBrief(answers) {
  const result = answerSchema.safeParse(answers);
  if (!result.success) throw badRequest('Please check your consultation answers.');
  const clean = result.data;
  const missing = questions.filter((q) => active(q, clean) && q.required && (clean[q.key] === undefined || clean[q.key] === ''));
  if (missing.length) throw badRequest('Complete the required questions before confirming.', { fields: Object.fromEntries(missing.map((q) => [q.key, `${q.label} is required.`])) });
  if (clean.shape !== 'Rectangular' || clean.terrain === 'Sloped') {
    throw badRequest('The initial design scope supports rectangular, flat plots. Your draft can still be saved.', { code: 'UNSUPPORTED_SCOPE' });
  }
  const visibleAnswers = Object.fromEntries(questions.filter((q) => active(q, clean) && clean[q.key] !== undefined).map((q) => [q.key, clean[q.key]]));
  return { questionnaireVersion: 1, answers: visibleAnswers, siteAreaM2: clean.width * clean.length,
    currency: 'ZAR', stage: 'concept_brief',
    assumptions: ['Single-storey concept on a rectangular plot.', 'Budget inclusions require clarification in the future cost model.', 'Boundary clearances and site services require professional review.'],
    reviewNotes: [ ...(clean.terrain === 'Unknown' ? ['Site terrain has not been verified.'] : []), ...(clean.access === 'Unknown' ? ['Road access direction is unknown.'] : []),
      'Additional essential features, accessibility, and future plans are recorded for review.', 'Validated architectural generation and pricing validation are not available in this release.' ] };
}
module.exports = { steps, answerSchema, buildBrief };
