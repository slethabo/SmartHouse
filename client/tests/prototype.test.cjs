const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { buildSync } = require('esbuild');
const result = buildSync({ entryPoints: [path.join(__dirname, '../src/demo/store.js')], bundle: true, platform: 'node', format: 'cjs', write: false });
const bundled = new Module(__filename);
bundled._compile(result.outputFiles[0].text, __filename);
const { prototypeRequest: request } = bundled.exports;
const layoutBundle = buildSync({ entryPoints: [path.join(__dirname, '../src/demo/layout.js')], bundle: true, platform: 'node', format: 'cjs', write: false });
const layoutModule = new Module(__filename);
layoutModule._compile(layoutBundle.outputFiles[0].text, __filename);
const { createHouseConcept } = layoutModule.exports;
const modelBundle = buildSync({ stdin: { contents: 'export * from "./houseModel.js"; export * as THREE from "three";', resolveDir: path.join(__dirname, '../src/demo'), sourcefile: 'model-test-entry.js' }, bundle: true, platform: 'node', format: 'cjs', write: false });
const modelModule = new Module(__filename);
modelModule.paths = module.paths;
modelModule._compile(modelBundle.outputFiles[0].text, __filename);
const { buildHouseModel, disposeHouseModel, THREE } = modelModule.exports;
const answers = { location: 'Demo', width: 20, length: 30, shape: 'Rectangular', terrain: 'Flat', access: 'South', budget: 1500000, finish: 'Basic', budgetIncludes: 'Labour and materials', occupants: 4, bedrooms: 3, bathrooms: 2, workFromHome: 'No', guests: 'Rarely', kitchen: 'Open plan', style: 'Modern', privacy: 'No preference', accessibility: 'None stated' };
beforeEach(() => {
  const storage = new Map();
  global.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  global.fetch = () => { throw new Error('Prototype must not contact a backend.'); };
});
test('create, save, confirm and reopen with no backend', async () => {
  const { data: project } = await request('/projects', { method: 'POST', body: { title: 'Demo home' } });
  const { data: draft } = await request(`/projects/${project.id}/consultation`, { method: 'PUT', body: { expectedRevision: 0, answers } });
  const { data: brief } = await request(`/projects/${project.id}/briefs`, { method: 'POST', body: { draftRevision: draft.revision, acknowledged: true } });
  const { data: reopened } = await request(`/projects/${project.id}`);
  assert.equal(reopened.briefs[0].id, brief.id);
  assert.equal(reopened.draft.answers.bedrooms, 3);
  const { data: list } = await request('/projects');
  assert.equal(list.items.length, 1);
});
test('incomplete brief and stale updates cannot overwrite saved data', async () => {
  const { data: p } = await request('/projects', { method: 'POST', body: { title: 'Demo' } });
  await assert.rejects(request(`/projects/${p.id}/briefs`, { method: 'POST', body: { draftRevision: 0, acknowledged: true } }), /highlighted/);
  await request(`/projects/${p.id}/consultation`, { method: 'PUT', body: { expectedRevision: 0, answers } });
  await assert.rejects(request(`/projects/${p.id}/consultation`, { method: 'PUT', body: { expectedRevision: 0, answers: {} } }), /another tab/);
});
test('catalogue, saved designs and rates work locally', async () => {
  const { data: catalogue } = await request('/plans');
  assert.ok(catalogue.items.length > 0);
  const id = catalogue.items[0].id;
  await request(`/plans/${id}/save`, { method: 'POST' });
  assert.equal((await request('/plans/saved')).data.items.length, 1);
  await request('/admin/rates/basic', { method: 'PUT', body: { rate_per_m2: 10000 } });
  const { data: detail } = await request(`/plans/${id}`);
  assert.equal(detail.estimate.low, detail.floor_area_m2 * 10000);
});
test('storage failures are visible rather than reporting false saves', async () => {
  global.localStorage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(request('/projects', { method: 'POST', body: { title: 'Demo' } }), /could not save/);
});

test('supported room counts produce non-overlapping rooms with direct circulation', () => {
  for (let bedrooms = 1; bedrooms <= 6; bedrooms++) {
    for (let bathrooms = 1; bathrooms <= 4; bathrooms++) {
      const house = createHouseConcept({ ...answers, bedrooms, bathrooms });
      assert.equal(house.rooms.filter((r) => r.type === 'bedroom').length, bedrooms);
      assert.equal(house.rooms.filter((r) => r.type === 'bathroom').length, bathrooms);
      for (const room of house.rooms) {
        assert.ok(room.width > 0 && room.depth > 0);
        assert.ok(room.x >= 0 && room.y >= 0 && room.x + room.width <= house.width + .001 && room.y + room.depth <= house.length + .001);
        if (['bedroom', 'bathroom', 'office', 'utility'].includes(room.type)) {
          const door = house.doors.find((d) => d.connects.includes(room.id) && d.connects.includes('hall'));
          assert.ok(door, `${room.name} has hallway access`);
          assert.ok(door.y >= room.y && door.y + door.length <= room.y + room.depth);
          assert.ok(house.windows.some((w) => w.roomId === room.id));
        }
        for (const other of house.rooms.filter((r) => r.id !== room.id)) {
          const overlapX = Math.min(room.x + room.width, other.x + other.width) - Math.max(room.x, other.x);
          const overlapY = Math.min(room.y + room.depth, other.y + other.depth) - Math.max(room.y, other.y);
          assert.ok(overlapX <= .001 || overlapY <= .001, `${room.name} must not overlap ${other.name}`);
        }
      }
      assert.ok(house.doors.some((d) => d.entrance));
      assert.equal(house.total, Math.round(house.footprintArea * house.rate));
    }
  }
});
test('office, separate kitchen and plot/budget conflicts change the concept honestly', () => {
  const base = createHouseConcept(answers);
  const extended = createHouseConcept({ ...answers, kitchen: 'Separate', workFromHome: 'Yes', office: 'Dedicated quiet office', bedrooms: 5, bathrooms: 3 });
  assert.ok(extended.rooms.some((r) => r.type === 'office'));
  assert.ok(extended.rooms.some((r) => r.type === 'kitchen'));
  assert.ok(extended.footprintArea > base.footprintArea);
  const constrained = createHouseConcept({ ...answers, width: 8, length: 9, budget: 100000 });
  assert.equal(constrained.fitsPlot, false);
  assert.equal(constrained.withinBudget, false);
  assert.equal(constrained.conflicts.length, 2);
  const east = createHouseConcept({ ...answers, access: 'East', width: 25, length: 12 });
  assert.equal(east.plotFrontage, 12);
  assert.equal(east.plotDepth, 25);
});

test('3D model matches room floors and contains actual window openings in its walls', () => {
  const house = createHouseConcept(answers);
  const model = buildHouseModel(house);
  model.root.updateMatrixWorld(true);
  const floors = model.root.children.filter((object) => object.name.startsWith('floor:'));
  assert.equal(floors.length, house.rooms.length);
  assert.equal(model.exterior.children.filter((object) => object.name === 'window').length, house.windows.length);
  const frontWall = model.exterior.children.find((object) => object.name === 'wall' && object.userData.axis === 'x' && object.position.z < 0);
  const window = house.windows.find((w) => w.axis === 'x');
  const ray = new THREE.Raycaster(new THREE.Vector3(window.x + window.length / 2 - house.width / 2, 1.4, -house.length / 2 - 1), new THREE.Vector3(0,0,1));
  assert.equal(ray.intersectObject(frontWall).length, 0, 'Window opening must not be covered by solid wall geometry');
  ray.ray.origin.x = 3 - house.width / 2;
  assert.ok(ray.intersectObject(frontWall).length > 0, 'Solid wall next to the opening must remain present');
  model.root.traverse((object) => {
    const positions = object.geometry?.getAttribute('position');
    if (positions) assert.ok(Array.from(positions.array).every(Number.isFinite));
  });
  disposeHouseModel(model.root);
});
test('traditional 3D roof has a ridge above the modern flat roof and supports cutaway', () => {
  for (const style of ['Traditional', 'Modern']) {
    const house = createHouseConcept({ ...answers, style });
    const model = buildHouseModel(house);
    model.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model.roof);
    assert.ok(Math.abs(bounds.max.y - (style === 'Traditional' ? 4 : 3)) < .001);
    model.roof.visible = false;
    assert.ok(model.furniture.children.length > 0);
    assert.ok(model.interior.children.length > 0);
    disposeHouseModel(model.root);
  }
});
