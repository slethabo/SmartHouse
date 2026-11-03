const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const datasetRoot = path.join(root, 'client/Floor_plan_dataset/archive/train');
const outputPath = path.join(root, 'client/Floor_plan_dataset/catalog.json');

function readClassNames(yaml) {
  const match = yaml.match(/^names:\s*\[([^\]]*)\]/m);
  if (!match) throw new Error('Could not read dataset class names from data.yaml.');
  return match[1].split(',').map((name) => name.trim().replace(/^['"]|['"]$/g, ''));
}

function parseAnnotations(text, fileName, classNames) {
  const objects = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const values = line.trim().split(/\s+/).map(Number);
    if (values.length !== 5 || values.some((value) => !Number.isFinite(value))) {
      throw new Error(`Invalid YOLO annotation at ${fileName}:${index + 1}.`);
    }
    const [classIndex, centerX, centerY, width, height] = values;
    if (!Number.isInteger(classIndex) || !classNames[classIndex]) {
      throw new Error(`Unknown annotation class at ${fileName}:${index + 1}.`);
    }
    if (width <= 0 || height <= 0 || centerX - width / 2 < 0 || centerY - height / 2 < 0
      || centerX + width / 2 > 1 || centerY + height / 2 > 1) {
      throw new Error(`Out-of-bounds normalized box at ${fileName}:${index + 1}.`);
    }
    objects.push({
      class: classNames[classIndex],
      box: {
        centerX: +centerX.toFixed(6),
        centerY: +centerY.toFixed(6),
        width: +width.toFixed(6),
        height: +height.toFixed(6),
      },
    });
  }
  return objects;
}

function buildCatalog(trainRoot = datasetRoot) {
  const yamlPath = path.resolve(trainRoot, '..', 'data.yaml');
  const imagesDirectory = path.join(trainRoot, 'images');
  const labelsDirectory = path.join(trainRoot, 'labels');
  const classNames = readClassNames(fs.readFileSync(yamlPath, 'utf8'));
  const groups = new Map();
  const imageNames = fs.readdirSync(imagesDirectory)
    .filter((name) => /\.(jpg|jpeg|png)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const imageName of imageNames) {
    const match = imageName.match(/^(\d+)_png\.rf\.[^.]+\.(jpg|jpeg|png)$/i);
    if (!match) throw new Error(`Unrecognized dataset image filename: ${imageName}`);
    const sourceId = Number(match[1]);
    const labelName = `${path.parse(imageName).name}.txt`;
    const labelPath = path.join(labelsDirectory, labelName);
    if (!fs.existsSync(labelPath)) throw new Error(`Missing paired annotation: ${labelName}`);
    const objects = parseAnnotations(fs.readFileSync(labelPath, 'utf8'), labelName, classNames);
    const counts = Object.fromEntries(classNames.map((name) => [name, 0]));
    for (const object of objects) counts[object.class] += 1;
    const variant = {
      id: `${sourceId}-${path.parse(imageName).name.split('.rf.')[1]}`,
      image: path.relative(root, path.join(imagesDirectory, imageName)).replaceAll('\\', '/'),
      annotation: path.relative(root, labelPath).replaceAll('\\', '/'),
      counts,
      objects,
    };
    if (!groups.has(sourceId)) groups.set(sourceId, []);
    groups.get(sourceId).push(variant);
  }

  const plans = [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([sourceId, variants]) => ({
      id: `plan-${String(sourceId).padStart(5, '0')}`,
      sourceId,
      reviewStatus: 'unreviewed',
      roomSemantics: null,
      variants,
    }));

  return {
    schemaVersion: 1,
    dataset: {
      name: 'Floor Plans 500 v1',
      split: 'train',
      license: 'CC BY 4.0 (as declared by the supplied export)',
      sourceUrl: 'https://universe.roboflow.com/umair-ab9ex/floor-plans-500-xqdyk/dataset/1',
      classes: classNames,
    },
    ordering: 'Numeric source ID; variants retain stable source filenames and paired annotation paths.',
    limitations: [
      'Annotations identify doors, windows, and generic zones only; they do not label room types.',
      'Source drawings provide no verified metric scale, storey count, or roof geometry.',
      'Room meanings must be reviewed and entered explicitly before a plan can drive house generation.',
      'Original filenames are preserved so image and annotation pairs remain intact.',
    ],
    planCount: plans.length,
    variantCount: imageNames.length,
    plans,
  };
}

if (require.main === module) {
  const catalog = buildCatalog();
  fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Catalogued ${catalog.planCount} source plans and ${catalog.variantCount} paired training variants.`);
}

module.exports = { buildCatalog, parseAnnotations, readClassNames };
