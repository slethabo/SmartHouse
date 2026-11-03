/* Reproducible, offline import of reviewed references. No ML class remapping. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'client/Floor_plan_dataset/archive');
const templates = require('../client/src/demo/floor-plan-templates.json');
const target = path.join(root, 'client/public/floor-plan-references');
fs.mkdirSync(target, { recursive: true });
const report = { dataset: 'Floor Plans 500 v1', license: 'CC BY 4.0 (as declared by the supplied export)',
  sourceUrl: 'https://universe.roboflow.com/umair-ab9ex/floor-plans-500-xqdyk/dataset/1',
  note: 'Source regions were visually reviewed. Metric dimensions are prototype design assumptions, not recovered source measurements. YOLO classes are not used as room semantics.',
  splits: {}, references: [] };
for (const split of ['train','valid','test']) {
  const images = fs.readdirSync(path.join(source, split, 'images')).filter((name) => /\.(jpg|png|jpeg)$/i.test(name));
  const originals = new Set(images.map((name) => name.split('.rf.')[0]));
  report.splits[split] = { images: images.length, sourcePlans: originals.size };
}
for (const template of templates) {
  const file = path.join(source, 'train/images', template.sourceFile);
  const labels = path.join(source, 'train/labels', template.sourceFile.replace(/\.jpg$/, '.txt'));
  if (!fs.existsSync(file) || !fs.existsSync(labels)) throw new Error(`Missing source image/annotation: ${template.id}`);
  const bytes = fs.readFileSync(file);
  fs.copyFileSync(file, path.join(target, `${template.sourceId}.jpg`));
  report.references.push({ templateId: template.id, sourceFile: template.sourceFile,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    reviewedRegions: template.sourceRegions, review: template.review });
}
fs.copyFileSync(path.join(source, 'README.dataset.txt'), path.join(target, 'DATASET-LICENSE.txt'));
fs.writeFileSync(path.join(target, 'attribution.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Prepared ${templates.length} reviewed source images; train images=${report.splits.train.images}, unique training plans=${report.splits.train.sourcePlans}.`);
