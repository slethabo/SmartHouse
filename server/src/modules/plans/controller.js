const service = require('./service');
const { ok } = require('../../utils/response');

async function browse(req, res) {
  const data = await service.browse(req.validated, req.user?.id);
  return ok(res, data);
}

async function detail(req, res) {
  const data = await service.getDetail(req.validated.id, req.user?.id);
  return ok(res, data);
}

async function listSaved(req, res) {
  const data = await service.listSaved(req.user.id);
  return ok(res, { items: data });
}

async function save(req, res) {
  const data = await service.savePlan(req.user.id, req.validated.id);
  return ok(res, data, 'Plan saved to your list.', 201);
}

async function unsave(req, res) {
  const data = await service.unsavePlan(req.user.id, req.validated.id);
  return ok(res, data, 'Plan removed from your saved list.');
}

module.exports = { browse, detail, listSaved, save, unsave };
