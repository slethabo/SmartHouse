jest.mock('../src/db/connection', () => ({ query: jest.fn(), transaction: jest.fn() }));
const db = require('../src/db/connection');
const projects = require('../src/modules/projects/service');
beforeEach(() => jest.clearAllMocks());
test('another owner cannot read a project or reach its draft data', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await expect(projects.detail(12, 7)).rejects.toMatchObject({ status: 404 });
  expect(db.query).toHaveBeenCalledTimes(1);
  expect(db.query.mock.calls[0][1]).toEqual([12, 7]);
});
test('stale drafts are rejected rather than overwritten', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: 12 }] }).mockResolvedValueOnce({ rows: [] });
  await expect(projects.save(12, 7, { expectedRevision: 1, answers: {} })).rejects.toMatchObject({ status: 409, details: { code: 'STALE_REVISION' } });
});
test('successful draft save returns the database revision', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: 12 }] }).mockResolvedValueOnce({ rows: [{ revision: 2, answers: { width: 20 } }] });
  await expect(projects.save(12, 7, { expectedRevision: 1, answers: { width: 20 } })).resolves.toEqual({ revision: 2, answers: { width: 20 } });
});
