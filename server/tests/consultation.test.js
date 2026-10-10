const { buildBrief, answerSchema } = require('../src/modules/projects/consultation');
const answers = { location: 'Johannesburg', width: 20, length: 30, shape: 'Rectangular', terrain: 'Flat', access: 'South', budget: 1500000, finish: 'Basic', budgetIncludes: 'Labour and materials', occupants: 4, bedrooms: 3, bathrooms: 2, workFromHome: 'No', guests: 'Rarely', kitchen: 'Open plan', style: 'Modern', privacy: 'No preference', accessibility: 'None stated' };
test('brief uses plot dimensions and excludes inactive follow-ups', () => {
  const brief = buildBrief({ ...answers, office: 'Dedicated quiet office' });
  expect(brief.siteAreaM2).toBe(600);
  expect(brief.answers.office).toBeUndefined();
});
test('required conditional office question is enforced', () => {
  expect(() => buildBrief({ ...answers, workFromHome: 'Yes' })).toThrow('Complete the required questions');
});
test('unsupported plot and terrain do not create a supported brief', () => {
  expect(() => buildBrief({ ...answers, shape: 'Other' })).toThrow('rectangular, flat plots');
  expect(() => buildBrief({ ...answers, terrain: 'Sloped' })).toThrow('rectangular, flat plots');
});
test('partial drafts allowed; unknown fields and invalid dimensions rejected', () => {
  expect(answerSchema.safeParse({ width: 20.5 }).success).toBe(true);
  expect(answerSchema.safeParse({ width: -1 }).success).toBe(false);
  expect(answerSchema.safeParse({ owner_id: 2 }).success).toBe(false);
  expect(() => buildBrief({})).toThrow('Complete the required questions');
});
