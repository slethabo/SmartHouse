jest.mock('../src/modules/auth/service', () => ({ getPrototypeUser: jest.fn(), verifyToken: jest.fn(), getUserById: jest.fn() }));
const config = require('../src/config');
const service = require('../src/modules/auth/service');
const { attachUser, requireAuth, requireRole } = require('../src/modules/auth/middleware');
const original = config.prototypeMode;
afterEach(() => { config.prototypeMode = original; jest.clearAllMocks(); });
test('prototype attaches shared identity without cookies or token verification', async () => {
  config.prototypeMode = true;
  service.getPrototypeUser.mockResolvedValue({ id: 99, role: 'admin' });
  const req = {}; const next = jest.fn();
  await attachUser(req, {}, next);
  expect(req.user.id).toBe(99);
  expect(service.verifyToken).not.toHaveBeenCalled();
  requireAuth(req, {}, next); requireRole('admin')(req, {}, next);
  expect(next.mock.calls).toEqual([[], [], []]);
});
test('turning prototype off restores unauthenticated rejection', async () => {
  config.prototypeMode = false;
  const req = { headers: {} }; const next = jest.fn();
  await attachUser(req, {}, next);
  requireAuth(req, {}, next);
  expect(service.getPrototypeUser).not.toHaveBeenCalled();
  expect(next.mock.calls[1][0].status).toBe(401);
});
