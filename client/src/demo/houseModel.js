import * as THREE from 'three';

/** Build real meshes from the shared floor-plan geometry. No network assets. */
export function buildHouseModel(h) {
  const root = new THREE.Group();
  root.name = 'house'; root.position.set(-h.width / 2, 0, -h.length / 2);
  const exterior = new THREE.Group(); exterior.name = 'exterior-walls'; root.add(exterior);
  const interior = new THREE.Group(); interior.name = 'interior-walls'; root.add(interior);
  const roof = new THREE.Group(); roof.name = 'roof'; root.add(roof);
  const furniture = new THREE.Group(); furniture.name = 'furniture'; root.add(furniture);
  const colour = h.style === 'Traditional' ? '#efdfc3' : h.style === 'Minimalist' ? '#d9d0bd' : '#f2eee4';
  const wallMaterial = new THREE.MeshStandardMaterial({ color: colour, roughness: .9 });
  const trim = new THREE.MeshStandardMaterial({ color: h.style === 'Traditional' ? '#f7f0df' : '#3b4846' });
  const glass = new THREE.MeshStandardMaterial({ color: '#8eb7c3', metalness: .25, roughness: .25, transparent: true, opacity: .65 });
  const timber = new THREE.MeshStandardMaterial({ color: '#8f694b', roughness: .8 });
  function box(group, x, y, z, w, height, depth, material, name) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, depth), typeof material === 'string' ? new THREE.MeshStandardMaterial({ color: material, roughness: .85 }) : material);
    mesh.position.set(x + w / 2, y + height / 2, z + depth / 2);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name || '';
    group.add(mesh); return mesh;
  }
  function wall(group, x, z, length, axis, openings = []) {
    if (length <= .01) return;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(length, 0); shape.lineTo(length, 2.8); shape.lineTo(0, 2.8); shape.closePath();
    for (const o of openings) {
      const start = Math.max(.001, o.start), end = Math.min(length - .001, o.start + o.length);
      if (end <= start) continue;
      const hole = new THREE.Path();
      hole.moveTo(start, o.bottom); hole.lineTo(start, o.top); hole.lineTo(end, o.top); hole.lineTo(end, o.bottom); hole.closePath();
      shape.holes.push(hole);
    }
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .16, bevelEnabled: false }), wallMaterial);
    mesh.name = 'wall'; mesh.userData = { axis, length, openings };
    if (axis === 'x') mesh.position.set(x, 0, z - .08);
    else { mesh.rotation.y = -Math.PI / 2; mesh.position.set(x + .08, 0, z); }
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }
  const frontWindows = h.windows.filter((w) => w.axis === 'x');
  const opening = (w, start) => ({ start, length: w.length, bottom: .85, top: 2 });
  wall(exterior, 0, 0, h.width, 'x', [...frontWindows.map((w) => opening(w, w.x)), { start: 3.9, length: 1, bottom: .001, top: 2.15 }]);
  wall(exterior, 0, h.length, h.width, 'x');
  for (const x of [0, h.width]) {
    const windows = h.windows.filter((w) => w.axis === 'y' && (x === 0 ? w.x < 1 : w.x > h.width - 1));
    wall(exterior, x, 0, h.length, 'z', windows.map((w) => opening(w, w.y)));
  }
  for (const w of h.windows) {
    const x = w.axis === 'x' ? w.x : w.x < 1 ? 0 : h.width;
    const z = w.axis === 'x' ? 0 : w.y;
    if (w.axis === 'x') {
      box(exterior, x, .85, z - .04, w.length, 1.15, .08, glass, 'window');
      for (const height of [.81, 2]) box(exterior, x - .05, height, z - .1, w.length + .1, .06, .2, trim);
      for (const offset of [-.05, w.length / 2 - .02, w.length]) box(exterior, x + offset, .85, z - .1, .05, 1.15, .2, trim);
    } else {
      box(exterior, x - .04, .85, z, .08, 1.15, w.length, glass, 'window');
      for (const height of [.81, 2]) box(exterior, x - .1, height, z - .05, .2, .06, w.length + .1, trim);
      for (const offset of [-.05, w.length / 2 - .02, w.length]) box(exterior, x - .1, .85, z + offset, .2, 1.15, .05, trim);
    }
  }
  box(exterior, 3.9, 0, -.07, 1, 2.15, .14, timber, 'entrance');
  box(exterior, 3.65, 2.3, -.5, 1.5, .12, .65, trim, 'entrance-canopy');
  box(root, 0, -.15, 0, h.width, .15, h.length, '#c3bbaa', 'foundation');
  const roomColours = { living: '#decfae', kitchen: '#d6d2c7', bedroom: '#dfc9a7', bathroom: '#cbdde0', office: '#d8cfdf', utility: '#d8d8ca', hall: '#e8dfcb' };
  for (const r of h.rooms) {
    const floor = box(root, r.x, .005, r.y, r.width, .03, r.depth, roomColours[r.type], `floor:${r.id}`);
    floor.userData.roomId = r.id;
    if (['bedroom', 'bathroom', 'office', 'utility'].includes(r.type)) {
      const edge = r.x < 1 ? r.x + r.width : r.x;
      const door = h.doors.find((d) => d.connects.includes(r.id) && d.connects.includes('hall'));
      wall(interior, edge, r.y, r.depth, 'z', [{ start: door.y - r.y, length: door.length, bottom: .001, top: 2.1 }]);
      wall(interior, r.x, r.y - .1, r.width, 'x');
    }
    if (r.type === 'kitchen') wall(interior, r.x, r.y, r.depth, 'z', [{ start: 1.25 - r.y, length: .9, bottom: .001, top: 2.1 }]);
    if (r.type === 'bedroom') {
      const x = r.x + (r.x > 4 ? 1.05 : .45);
      box(furniture, x, .04, r.y + 1.05, 1.5, .35, 2, timber, 'bed-frame');
      box(furniture, x, .39, r.y + 1.05, 1.5, .18, 2, '#f9f5e9', 'bed');
      box(furniture, x + .08, .57, r.y + 1.12, .62, .09, .35, '#ffffff');
      box(furniture, x + .8, .57, r.y + 1.12, .62, .09, .35, '#ffffff');
      box(furniture, r.x + r.width - .65, .04, r.y + 1.4, .5, 1.8, 1.5, '#bca88d', 'wardrobe');
    } else if (r.type === 'living') {
      box(furniture, r.x + .45, .04, r.y + 1.15, 2.5, .45, .8, '#9caa8b', 'sofa');
      box(furniture, r.x + .45, .49, r.y + 1.15, 2.5, .35, .15, '#9caa8b');
      box(furniture, r.x + .95, .1, r.y + 2.25, 1.4, .4, .65, timber, 'coffee-table');
      box(furniture, r.x + 3.1, .1, r.y + 3.1, 1.3, .7, .8, timber, 'dining-table');
    } else if (r.type === 'bathroom') {
      box(furniture, r.x + .2, .04, r.y + r.depth - 1, 1.5, .5, .7, '#ffffff', 'bath');
      box(furniture, r.x + 2.5, .04, r.y + r.depth - .75, .7, .8, .55, '#ffffff', 'vanity');
    } else if (r.type === 'office') box(furniture, r.x + .35, .04, r.y + 1.6, 1.6, .75, .65, timber, 'desk');
    if (r.type === 'kitchen' || (r.type === 'living' && r.width > 6)) {
      box(furniture, r.x + r.width - 2.6, .04, r.y + 1.1, 2.4, .9, .6, '#c3b59f', 'kitchen-counter');
      box(furniture, r.x + r.width - .75, .04, r.y + 1.1, .6, .9, 1.65, '#c3b59f');
    }
  }
  const roofMaterial = new THREE.MeshStandardMaterial({ color: h.style === 'Traditional' ? '#95604e' : h.style === 'Minimalist' ? '#767a6b' : '#4e5b53', roughness: .95, side: THREE.DoubleSide });
  if (h.style === 'Traditional') {
    const shape = new THREE.Shape(); shape.moveTo(-.3, 2.8); shape.lineTo(h.width / 2, 4); shape.lineTo(h.width + .3, 2.8); shape.lineTo(h.width + .3, 2.66); shape.lineTo(h.width / 2, 3.86); shape.lineTo(-.3, 2.66); shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: h.length + .6, bevelEnabled: false }), roofMaterial);
    mesh.position.z = -.3; mesh.castShadow = true; mesh.name = 'pitched-roof'; roof.add(mesh);
    for (const z of [0, h.length - .06]) {
      const gable = new THREE.Shape(); gable.moveTo(0,2.8); gable.lineTo(h.width / 2,4); gable.lineTo(h.width,2.8); gable.closePath();
      const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: .06, bevelEnabled: false }), wallMaterial); mesh.position.z = z; roof.add(mesh);
    }
  } else box(roof, -.2, 2.8, -.2, h.width + .4, .2, h.length + .4, roofMaterial, 'flat-roof');
  return { root, exterior, interior, roof, furniture };
}

export function disposeHouseModel(root) {
  const materials = new Set();
  root.traverse((object) => {
    object.shadow?.dispose();
    object.geometry?.dispose();
    for (const material of (Array.isArray(object.material) ? object.material : object.material ? [object.material] : [])) materials.add(material);
  });
  materials.forEach((material) => material.dispose());
}
