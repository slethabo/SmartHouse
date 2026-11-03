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
const furnitureBundle = buildSync({ entryPoints: [path.join(__dirname, '../src/demo/furniture.js')], bundle: true, platform: 'node', format: 'cjs', write: false });
const furnitureModule = new Module(__filename);
furnitureModule._compile(furnitureBundle.outputFiles[0].text, __filename);
const { placeFurniture } = furnitureModule.exports;
const consultationBundle = buildSync({ entryPoints: [path.join(__dirname, '../src/utils/consultation.js')], bundle: true, platform: 'node', format: 'cjs', write: false });
const consultationModule = new Module(__filename);
consultationModule._compile(consultationBundle.outputFiles[0].text, __filename);
const { validateConsultation, consultationProgress, siteScopeErrors, formatConsultationAnswer } = consultationModule.exports;
const questionnaire = require('../src/demo/consultation.json');
const modelBundle = buildSync({ stdin: { contents: 'export * from "./houseModel.js"; export * as THREE from "three";', resolveDir: path.join(__dirname, '../src/demo'), sourcefile: 'model-test-entry.js' }, bundle: true, platform: 'node', format: 'cjs', write: false });
const modelModule = new Module(__filename);
modelModule.paths = module.paths;
modelModule._compile(modelBundle.outputFiles[0].text, __filename);
const { buildHouseModel, disposeHouseModel, THREE } = modelModule.exports;
const answers = { location: 'Demo', width: 20, length: 30, shape: 'Rectangular', terrain: 'Flat', access: 'South', budget: 1500000, finish: 'Basic', budgetIncludes: ['Labour', 'Materials'], occupants: 4, bedrooms: 3, bathrooms: 2, workFromHome: 'No', guests: 'Rarely', kitchen: 'Open plan', style: 'Modern', privacy: 'No preference', accessibility: 'None stated' };
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

test('step validation catches missing checkbox selections and whitespace while drafts may stay incomplete', () => {
  assert.deepEqual(validateConsultation(questionnaire.steps, {}, { complete: false }), {});
  const required = validateConsultation([questionnaire.steps[1]], { ...answers, budgetIncludes: [] }, { complete: true });
  assert.equal(required.budgetIncludes, 'Select at least one option.');
  assert.ok(validateConsultation([questionnaire.steps[0]], { ...answers, location: '   ' }, { complete: true }).location);
  assert.ok(validateConsultation(questionnaire.steps, { ...answers, bedrooms: 2.5 }).bedrooms);
  assert.ok(validateConsultation(questionnaire.steps, { ...answers, budgetIncludes: ['Labour', 'Labour'] }).budgetIncludes);
  assert.equal(validateConsultation(questionnaire.steps, { ...answers, width: 20.5 }).width, undefined);
});

test('conditional questions affect readiness only when visible and old hidden answers do not block saving', () => {
  const base = consultationProgress(questionnaire.steps, answers);
  assert.equal(base.answered, base.total);
  assert.ok(base.sections.every((section) => section.complete));
  const extended = { ...answers, workFromHome: 'Yes', guests: 'Often', accessibility: 'Other needs' };
  const required = validateConsultation(questionnaire.steps, extended, { complete: true });
  assert.ok(required.office && required.guestNeeds && required.accessibilityNotes);
  const progress = consultationProgress(questionnaire.steps, extended);
  assert.equal(progress.total, base.total + 3);
  assert.equal(progress.answered, base.answered);
  assert.equal(validateConsultation(questionnaire.steps, { ...answers, office: 'invalid hidden choice' }).office, undefined);
});

test('unsupported site conditions can be saved as drafts but cannot create a confirmed concept', async () => {
  const { data: p } = await request('/projects', { method: 'POST', body: { title: 'Sloped site' } });
  const draft = await request(`/projects/${p.id}/consultation`, { method: 'PUT', body: { expectedRevision: 0, answers: { ...answers, terrain: 'Sloped' } } });
  await assert.rejects(request(`/projects/${p.id}/briefs`, { method: 'POST', body: { draftRevision: draft.data.revision, acknowledged: true } }), (error) => Boolean(error.fields.terrain));
  assert.equal((await request(`/projects/${p.id}`)).data.draft.answers.terrain, 'Sloped');
  assert.ok(siteScopeErrors({ shape: 'Other' }).shape);
  assert.deepEqual(siteScopeErrors({ shape: 'Rectangular', terrain: 'Unknown' }), {});
});

test('confirmation rejects whitespace-only required text and leaves the draft intact', async () => {
  const { data: p } = await request('/projects', { method: 'POST', body: { title: 'Incomplete details' } });
  await request(`/projects/${p.id}/consultation`, { method: 'PUT', body: { expectedRevision: 0, answers: { ...answers, location: '   ' } } });
  await assert.rejects(request(`/projects/${p.id}/briefs`, { method: 'POST', body: { draftRevision: 1, acknowledged: true } }), (error) => Boolean(error.fields.location));
  assert.equal((await request(`/projects/${p.id}`)).data.briefs.length, 0);
  assert.equal(formatConsultationAnswer(['Labour', 'Materials']), 'Labour, Materials');
  assert.equal(formatConsultationAnswer(undefined), 'Not provided');
});

test('supported room counts produce non-overlapping rooms with connected circulation', () => {
  for (let bedrooms = 1; bedrooms <= 6; bedrooms++) {
    for (let bathrooms = 1; bathrooms <= 4; bathrooms++) {
      const house = createHouseConcept({ ...answers, bedrooms, bathrooms });
      assert.equal(house.rooms.filter((r) => r.type === 'bedroom').length, bedrooms);
      assert.equal(house.rooms.filter((r) => r.type === 'bathroom').length, bathrooms);
      for (const room of house.rooms) {
        assert.ok(room.width > 0 && room.depth > 0);
        assert.ok(room.x >= 0 && room.y >= 0 && room.x + room.width <= house.width + .001 && room.y + room.depth <= house.length + .001);
        if (['bedroom', 'bathroom', 'office', 'utility'].includes(room.type)) {
          assert.ok(house.doors.some((d) => d.connects.includes(room.id)), `${room.name} has a doorway`);
          if (room.type === 'bedroom') assert.ok(house.windows.some((w) => w.roomId === room.id), `${room.name} has an exterior window`);
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
  const window = house.windows[0];
  const segment = house.walls.find((w) => w.exterior && w.axis === window.axis && Math.abs((w.axis === 'x' ? w.y : w.x) - (w.axis === 'x' ? window.y : window.x)) < .001);
  const wallMesh = model.exterior.children.find((object) => object.name === 'wall' && object.userData.axis === (segment.axis === 'x' ? 'x' : 'z')
    && Math.abs((segment.axis === 'x' ? object.position.z : object.position.x) - (segment.axis === 'x' ? segment.y - .08 : segment.x + .08)) < .001);
  const ray = new THREE.Raycaster();
  function castAt(offset) {
    if (segment.axis === 'x') {
      const direction = segment.y === 0 ? 1 : -1;
      ray.set(new THREE.Vector3(segment.x + offset - house.width/2,1.4,segment.y-house.length/2-direction),new THREE.Vector3(0,0,direction));
    } else {
      const direction = segment.x === 0 ? 1 : -1;
      ray.set(new THREE.Vector3(segment.x-house.width/2-direction,1.4,segment.y+offset-house.length/2),new THREE.Vector3(direction,0,0));
    }
    return ray.intersectObject(wallMesh);
  }
  const windowOffset = (segment.axis === 'x' ? window.x-segment.x : window.y-segment.y) + window.length/2;
  assert.equal(castAt(windowOffset).length,0,'The actual selected exterior wall must contain a window opening');
  const solid = Array.from({length:50},(_,i)=>(i+.5)*segment.length/50).find((point)=>!wallMesh.userData.openings.some((o)=>point>o.start-.1&&point<o.start+o.length+.1));
  assert.ok(solid !== undefined);
  assert.ok(castAt(solid).length>0,'Wall next to the opening must remain solid');
  model.root.traverse((object) => {
    const positions = object.geometry?.getAttribute('position');
    if (positions) assert.ok(Array.from(positions.array).every(Number.isFinite));
  });
  disposeHouseModel(model.root);
});
test('traditional roof has a ridge and all roof designs support cutaway', () => {
  for (const style of ['Traditional', 'Modern']) {
    const house = createHouseConcept({ ...answers, style });
    const model = buildHouseModel(house);
    model.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model.roof);
    if(style==='Traditional')assert.ok(Math.abs(bounds.max.y-4)<.001);
    else assert.ok(bounds.max.y>=3&&bounds.max.y<4);
    model.roof.visible = false;
    assert.ok(model.furniture.children.length > 0);
    assert.ok(model.interior.children.length > 0);
    disposeHouseModel(model.root);
  }
});

test('all reviewed source plans are packaged unchanged with attribution', () => {
  const fs = require('node:fs');
  const crypto = require('node:crypto');
  const templates = require('../src/demo/floor-plan-templates.json');
  const attribution = require('../public/floor-plan-references/attribution.json');
  assert.equal(templates.length, 3);
  for (const template of templates) {
    const source = fs.readFileSync(path.join(__dirname, '../Floor_plan_dataset/archive/train/images', template.sourceFile));
    const asset = fs.readFileSync(path.join(__dirname, '../public', template.image));
    assert.deepEqual(asset, source, 'Original image and its markings must be retained');
    assert.equal(crypto.createHash('sha256').update(asset).digest('hex'), attribution.references.find((r) => r.templateId === template.id).sha256);
    assert.ok(template.sourceRegions.length >= 4);
  }
});

test('all dataset families keep room counts, suite privacy, non-overlap and physical door connections', () => {
  const families = ['Linear living','Split living','Wide family residence'];
  for (const layoutPreference of families) for (let bedrooms=1; bedrooms<=6; bedrooms++) for (let bathrooms=1; bathrooms<=4; bathrooms++)
    for (const spaceLevel of ['Compact','Balanced','Generous']) for (const extra of [false,true]) {
      const house = createHouseConcept({...answers,layoutPreference,bedrooms,bathrooms,spaceLevel,kitchen:'Separate',workFromHome:'Yes',office:'Dedicated quiet office',
        homeFeatures:extra?['Main en-suite','Walk-in wardrobe','Separate dining room','Entertainment room','Double garage']:[]});
      assert.equal(house.template.name,layoutPreference);
      assert.equal(house.rooms.filter((r)=>r.type==='bedroom').length,bedrooms);
      assert.equal(house.rooms.filter((r)=>r.type==='bathroom').length,bathrooms);
      const reached=new Set(['outside']);
      for (let i=0;i<house.rooms.length+1;i++) for (const door of house.doors)
        if (door.connects.some((id)=>reached.has(id))) door.connects.forEach((id)=>reached.add(id));
      for (const room of house.rooms) {
        assert.ok(reached.has(room.id),room.name+' must be reachable from outside');
        assert.ok(room.width>0&&room.depth>0&&Number.isFinite(room.area));
        if (room.nominalDepth) assert.ok(room.depth / room.nominalDepth <= 1.5,room.name+' must not absorb an oversized leftover strip');
        assert.ok(room.x>=0&&room.y>=0&&room.x+room.width<=house.width+.001&&room.y+room.depth<=house.length+.001);
        if (room.privateTo) assert.ok(house.doors.filter((d)=>d.connects.includes(room.id)).every((d)=>d.connects.includes(room.privateTo)),'Suite spaces must open into the main bedroom only');
        for (const other of house.rooms.filter((r)=>r.id!==room.id)) {
          const x=Math.min(room.x+room.width,other.x+other.width)-Math.max(room.x,other.x);
          const y=Math.min(room.y+room.depth,other.y+other.depth)-Math.max(room.y,other.y);
          assert.ok(x<=.001||y<=.001,room.name+' must not overlap '+other.name);
        }
      }
      for (const door of house.doors.filter((d)=>!d.connects.includes('outside'))) {
        const pair=door.connects.map((id)=>house.rooms.find((r)=>r.id===id));
        assert.ok(pair.every(Boolean));
        for (const room of pair) {
          if (door.axis==='x') {
            assert.ok(Math.abs(door.y-room.y)<.001||Math.abs(door.y-room.y-room.depth)<.001);
            assert.ok(door.x>=room.x-.001&&door.x+door.length<=room.x+room.width+.001);
          } else {
            assert.ok(Math.abs(door.x-room.x)<.001||Math.abs(door.x-room.x-room.width)<.001);
            assert.ok(door.y>=room.y-.001&&door.y+door.length<=room.y+room.depth+.001);
          }
        }
      }
      assert.equal(house.total,Math.round(house.footprintArea*house.rate));
    }
});

test('six-bedroom open-plan home keeps living and utility spaces in proportion', () => {
  const house=createHouseConcept({...answers,bedrooms:6,bathrooms:3,layoutPreference:'Wide family residence',spaceLevel:'Balanced'});
  const hall=house.rooms.find((r)=>r.type==='hall');
  const bedrooms=house.rooms.filter((r)=>r.type==='bedroom');
  assert.equal(bedrooms.length,6);
  assert.ok(bedrooms.some((r)=>r.x<hall.x)&&bedrooms.some((r)=>r.x>hall.x),'Bedrooms must occupy both wings');
  assert.ok(house.rooms.find((r)=>r.type==='living').depth<=6.5);
  assert.ok(house.rooms.find((r)=>r.type==='utility').depth<=4);
});

test('source cores remain distinct and bedroom additions preserve the original room positions', () => {
  const cases=[['Linear living',1,'mono-pitch'],['Split living',2,'butterfly'],['Wide family residence',3,'stepped-pavilions']];
  for(const [layoutPreference,bedrooms,roofDesign] of cases){
    const base=createHouseConcept({...answers,layoutPreference,bedrooms,bathrooms:1,kitchen:'Separate'});
    const expanded=createHouseConcept({...answers,layoutPreference,bedrooms:6,bathrooms:1,kitchen:'Separate'});
    assert.equal(base.roofDesign,roofDesign);
    const shiftX=expanded.rooms[0].x-base.rooms[0].x,shiftY=expanded.rooms[0].y-base.rooms[0].y;
    for(const room of base.rooms){
      const same=expanded.rooms.find(r=>r.id===room.id);
      assert.ok(same);
      assert.deepEqual([+(same.x-shiftX).toFixed(4),+(same.y-shiftY).toFixed(4),same.width,same.depth],[room.x,room.y,room.width,room.depth],'An addition may translate the drawing origin but must not repack the original source core');
    }
    if(layoutPreference!=='Linear living')assert.ok(base.footprintArea<base.width*base.length-1,'Source setbacks must remain outside the enclosed area');
    const model=buildHouseModel(base);
    assert.equal(model.root.children.filter(o=>o.name.startsWith('foundation:')).length,base.rooms.length);
    const roofRooms=new Set(model.roof.children.map(o=>o.userData.roomId));
    assert.equal(roofRooms.size,base.rooms.length,'Roofs must cover actual rooms rather than the enclosing rectangle');
    for(const wall of base.walls.filter(w=>w.exterior)){
      const x=wall.x+(wall.axis==='x'?wall.length/2:0),y=wall.y+(wall.axis==='y'?wall.length/2:0);
      const inside=(px,py)=>base.rooms.some(r=>px>r.x&&px<r.x+r.width&&py>r.y&&py<r.y+r.depth);
      const sides=wall.axis==='x'?[inside(x,y-.01),inside(x,y+.01)]:[inside(x-.01,y),inside(x+.01,y)];
      assert.equal(sides.filter(Boolean).length,1,'An exterior wall must border outdoor space on exactly one side');
    }
    disposeHouseModel(model.root);
  }
});

test('furniture stays inside rooms without overlapping in both kitchen arrangements', () => {
  for (const layoutPreference of ['Linear living','Split living','Wide family residence'])
    for (let bedrooms=1;bedrooms<=6;bedrooms++) for (let bathrooms=1;bathrooms<=4;bathrooms++)
      for (const spaceLevel of ['Compact','Balanced','Generous']) for (const kitchen of ['Separate','Open plan']) {
        const house=createHouseConcept({...answers,layoutPreference,bedrooms,bathrooms,spaceLevel,kitchen,
          homeFeatures:['Main en-suite','Walk-in wardrobe','Separate dining room','Entertainment room','Double garage']});
        for (const room of house.rooms) {
          const items=placeFurniture(room);
          for (const [index,item] of items.entries()) {
            assert.ok(item.width>0&&item.depth>0&&item.height>0);
            assert.ok(item.x>=room.x-.001&&item.y>=room.y-.001&&item.x+item.width<=room.x+room.width+.001&&item.y+item.depth<=room.y+room.depth+.001,room.name+': '+item.kind+' must fit');
            for (const other of items.slice(index+1)) {
              const dx=Math.min(item.x+item.width,other.x+other.width)-Math.max(item.x,other.x);
              const dy=Math.min(item.y+item.depth,other.y+other.depth)-Math.max(item.y,other.y);
              assert.ok(dx<=.001||dy<=.001,room.name+': '+item.kind+' overlaps '+other.kind);
            }
          }
        }
      }
});

test('generous spaces and luxury features change actual geometry independently of finish quality', () => {
  const base={...answers,width:80,length:80,budget:100000000,layoutPreference:'Wide family residence'};
  const regular=createHouseConcept({...base,spaceLevel:'Compact'});
  const premium=createHouseConcept({...base,spaceLevel:'Compact',finish:'Premium'});
  assert.deepEqual(regular.rooms,premium.rooms,'Premium finishes alone must not enlarge the house');
  assert.ok(premium.total>regular.total);
  const luxury=createHouseConcept({...base,spaceLevel:'Generous',homeFeatures:['Main en-suite','Walk-in wardrobe','Separate dining room','Entertainment room','Double garage']});
  assert.ok(luxury.footprintArea>regular.footprintArea);
  for (const name of ['Main en-suite','Walk-in wardrobe','Dining room','Entertainment room','Double garage'])
    assert.ok(luxury.rooms.some((r)=>r.name===name),name+' must be generated');
  assert.equal(luxury.rooms.filter((r)=>r.type==='bathroom').length,base.bathrooms);
  assert.ok(luxury.doors.some((d)=>d.garage));
  const constrained=createHouseConcept({...base,width:8,length:8,budget:100000,spaceLevel:'Generous',homeFeatures:luxury.features});
  assert.equal(constrained.fitsPlot,false); assert.equal(constrained.withinBudget,false);
  assert.ok(constrained.rooms.some((r)=>r.type==='garage'),'A budget conflict must not silently drop the requested garage');
});

test('best-fit selection compares source families and exposes reproducible alternatives', () => {
  const house=createHouseConcept({...answers,width:100,length:100,budget:100000000,spaceLevel:'Generous',homeFeatures:['Double garage']});
  assert.equal(house.template.id,'wide-979');
  assert.equal(house.alternatives.length,2);
  assert.equal(new Set([house.template.id,...house.alternatives.map((a)=>a.templateId)]).size,3);
  assert.deepEqual(house,createHouseConcept({...answers,width:100,length:100,budget:100000000,spaceLevel:'Generous',homeFeatures:['Double garage']}));
});

test('three-dimensional models include every optional room and derive interior openings from shared geometry', () => {
  for (const layoutPreference of ['Linear living','Split living','Wide family residence']) {
    const house=createHouseConcept({...answers,layoutPreference,spaceLevel:'Generous',homeFeatures:['Main en-suite','Walk-in wardrobe','Separate dining room','Entertainment room','Double garage']});
    const model=buildHouseModel(house);
    assert.equal(model.root.children.filter((o)=>o.name.startsWith('floor:')).length,house.rooms.length);
    assert.ok(model.exterior.children.some((o)=>o.name==='garage-door'));
    assert.equal(model.exterior.children.filter((o)=>o.name==='window').length,house.windows.length);
    assert.ok(model.interior.children.some((o)=>o.userData.openings?.length));
    model.root.traverse((object)=>{
      const positions=object.geometry?.getAttribute('position');
      if (positions) assert.ok(Array.from(positions.array).every(Number.isFinite));
    });
    disposeHouseModel(model.root);
  }
});

test('dataset layout preferences and additional spaces survive draft confirmation and reopening', async () => {
  const selected={...answers,spaceLevel:'Generous',layoutPreference:'Wide family residence',homeFeatures:['Main en-suite','Walk-in wardrobe','Double garage']};
  const {data:project}=await request('/projects',{method:'POST',body:{title:'A larger family home'}});
  await request(`/projects/${project.id}/consultation`,{method:'PUT',body:{expectedRevision:0,answers:selected}});
  await request(`/projects/${project.id}/briefs`,{method:'POST',body:{draftRevision:1,acknowledged:true}});
  const reopened=(await request(`/projects/${project.id}`)).data.briefs[0];
  assert.deepEqual(reopened.brief.answers.homeFeatures,selected.homeFeatures);
  const house=createHouseConcept(reopened.brief.answers);
  assert.equal(house.template.id,'wide-979'); assert.equal(house.spaceLevel,'Generous');
  assert.ok(house.rooms.some((r)=>r.type==='garage'));
});
