const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { buildCatalog, parseAnnotations } = require('../../scripts/catalog-floor-plans.cjs');

test('training plan catalog groups every image with its paired annotation and stable source ID', () => {
  const catalog = buildCatalog(path.resolve(__dirname, '../Floor_plan_dataset/archive/train'));

  assert.equal(catalog.planCount, 279);
  assert.equal(catalog.variantCount, 837);
  assert.deepEqual(catalog.dataset.classes, ['door', 'window', 'zone']);
  assert.equal(catalog.plans[0].id, 'plan-00636');
  assert.equal(catalog.plans.at(-1).id, 'plan-01135');
  const annotationTotals = Object.fromEntries(catalog.dataset.classes.map((name) => [name, 0]));

  for (const plan of catalog.plans) {
    assert.equal(plan.variants.length, 3);
    assert.equal(plan.reviewStatus, 'unreviewed');
    assert.equal(plan.roomSemantics, null);
    for (const variant of plan.variants) {
      assert.match(variant.image, /\.jpg$/);
      assert.equal(variant.annotation, variant.image.replace('/images/', '/labels/').replace(/\.jpg$/, '.txt'));
      assert.deepEqual(Object.keys(variant.counts), catalog.dataset.classes);
      assert.equal(Object.values(variant.counts).reduce((sum, count) => sum + count, 0), variant.objects.length);
      for (const name of catalog.dataset.classes) annotationTotals[name] += variant.counts[name];
    }
  }
  assert.deepEqual(annotationTotals, { door: 6354, window: 4853, zone: 6544 });
});

test('YOLO catalog parsing rejects class mismatches and invalid normalized boxes', () => {
  assert.deepEqual(parseAnnotations('2 0.5 0.5 0.4 0.2', 'sample.txt', ['door', 'window', 'zone']), [
    { class: 'zone', box: { centerX: 0.5, centerY: 0.5, width: 0.4, height: 0.2 } },
  ]);
  assert.throws(() => parseAnnotations('3 0.5 0.5 0.4 0.2', 'sample.txt', ['door', 'window', 'zone']), /Unknown annotation class/);
  assert.throws(() => parseAnnotations('2 0.9 0.5 0.4 0.2', 'sample.txt', ['door', 'window', 'zone']), /Out-of-bounds/);
});
