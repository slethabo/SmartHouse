const { steps, buildBrief, answerSchema } = require('../src/modules/projects/consultation');
const answers = { location: 'Johannesburg', width: 20, length: 30, access: 'South', budget: 1500000, finish: 'Basic', budgetIncludes: ['Labour', 'Materials'], occupants: 4, bedrooms: 3, bathrooms: 2, workFromHome: 'No', guests: 'Rarely', kitchen: 'Open plan', style: 'Modern', privacy: 'No preference', accessibility: 'None stated' };
test('brief uses plot dimensions and excludes inactive follow-ups', () => {
  const brief = buildBrief({ ...answers, office: 'Dedicated quiet office' });
  expect(brief.siteAreaM2).toBe(600);
  expect(brief.answers.office).toBeUndefined();
});
test('required conditional office question is enforced', () => {
  expect(() => buildBrief({ ...answers, workFromHome: 'Yes' })).toThrow('Complete the required questions');
});
test('shape and terrain are not questionnaire inputs; brief states its site assumptions', () => {
  expect(steps[0].questions.map((question) => question.key)).not.toContain('shape');
  expect(steps[0].questions.map((question) => question.key)).not.toContain('terrain');
  const brief = buildBrief(answers);
  expect(brief.assumptions).toContain('Single-storey concept assuming a flat, rectangular plot.');
});
test('partial drafts allowed; unknown fields and invalid dimensions rejected', () => {
  expect(answerSchema.safeParse({ width: 20.5 }).success).toBe(true);
  expect(answerSchema.safeParse({ width: -1 }).success).toBe(false);
  expect(answerSchema.safeParse({ owner_id: 2 }).success).toBe(false);
  expect(() => buildBrief({})).toThrow('Complete the required questions');
});
test('budget inclusions accept multiple options and require at least one', () => {
  expect(answerSchema.safeParse({ budgetIncludes: ['Labour', 'Materials'] }).success).toBe(true);
  expect(answerSchema.safeParse({ budgetIncludes: ['Unknown'] }).success).toBe(false);
  expect(() => buildBrief({ ...answers, budgetIncludes: [] })).toThrow('Complete the required questions');
});
