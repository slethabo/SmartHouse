import * as THREE from 'three';
import { placeFurniture } from './furniture';
import { roofPanels, exteriorHeight, roofHeight } from './architecture';

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
  function wall(group, x, z, length, axis, openings = [], heights = [2.8,2.8]) {
    if (length <= .01) return;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(length, 0); shape.lineTo(length, heights[1]); shape.lineTo(0, heights[0]); shape.closePath();
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
  for (const segment of h.walls) {
    const axis = segment.axis;
    const sameLine = (o) => o.axis === axis && Math.abs((axis === 'x' ? o.y : o.x) - (axis === 'x' ? segment.y : segment.x)) < .001;
    const start = axis === 'x' ? segment.x : segment.y;
    const openings = [
      ...h.windows.filter(sameLine).map((w) => ({ start: (axis === 'x' ? w.x : w.y) - start, length: w.length, bottom: .85, top: 2 })),
      ...h.doors.filter(sameLine).map((d) => ({ start: (axis === 'x' ? d.x : d.y) - start, length: d.length, bottom: .001, top: d.garage ? 2.4 : 2.15 })),
    ].filter((o) => o.start < segment.length && o.start + o.length > 0);
    wall(segment.exterior ? exterior : interior, segment.x, segment.y, segment.length, axis === 'x' ? 'x' : 'z', openings, segment.exterior ? [exteriorHeight(h,segment),exteriorHeight(h,segment,segment.x+(axis==='x'?segment.length:0))] : [2.8,2.8]);
    if(!segment.exterior&&segment.roomIds.length===2){
      const pair=segment.roomIds.map(id=>h.rooms.find(r=>r.id===id));
      const heights=pair.map(r=>roofHeight(h,r,segment.x)-.16).sort((a,b)=>a-b);
      if(heights[1]-heights[0]>.05){
        const step=box(exterior,segment.x-(axis==='x'?0:.04),heights[0],segment.y-(axis==='x'?.04:0),axis==='x'?segment.length:.08,
          heights[1]-heights[0],axis==='x'?.08:segment.length,glass,'clerestory');
        step.userData.roomIds=segment.roomIds;
      }
    }
  }
  for (const w of h.windows) {
    const x = w.x;
    const z = w.y;
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
  for (const d of h.doors.filter(door=>door.entrance||door.garage)) {
    const alongX=d.axis==='x',height=d.garage?2.4:2.15;
    box(exterior,d.x-(alongX?0:.07),0,d.y-(alongX?.07:0),alongX?d.length:.14,height,alongX?.14:d.length,d.garage?trim:timber,d.garage?'garage-door':'entrance');
    if(d.entrance)box(exterior,d.x-.25,2.4,d.y-.3,alongX?d.length+.5:.7,.12,alongX?.7:d.length+.5,trim,'entrance-canopy');
  }
  for(const r of h.rooms)box(root,r.x,-.15,r.y,r.width,.15,r.depth,'#b5aea0',`foundation:${r.id}`);
  for(const t of h.terraces||[]){
    box(root,t.x,-.04,t.y,t.width,.08,t.depth,'#c4b69c','terrace');
    for(let z=t.y+.15;z<t.y+t.depth;z+=.22)box(root,t.x,.005,z,t.width,.01,.015,'#aa9b83','deck-joint');
  }
  const roomColours = { living: '#decfae', kitchen: '#d6d2c7', bedroom: '#dfc9a7', bathroom: '#cbdde0', office: '#d8cfdf', utility: '#d8d8ca', hall: '#e8dfcb', dining: '#ddceb5', entertainment: '#d8cfbd', dressing: '#d4c9bc', garage: '#b9bdba' };
  for (const r of h.rooms) {
    const floor = box(root, r.x, .005, r.y, r.width, .03, r.depth, roomColours[r.type], `floor:${r.id}`);
    floor.userData.roomId = r.id;
    for (const f of placeFurniture(r)) {
      const mesh = box(furniture,f.x,.04,f.y,f.width,f.height,f.depth,f.color,f.kind);
      mesh.userData.roomId = r.id;
      if (f.kind === 'bed') {
        box(furniture,f.x+.08,.04+f.height,f.y+.1,.6,.08,.3,'#ffffff','pillow');
        box(furniture,f.x+.82,.04+f.height,f.y+.1,.6,.08,.3,'#ffffff','pillow');
      }
    }
  }
  const roofMaterial=new THREE.MeshStandardMaterial({color:h.style==='Traditional'?'#805b4e':'#485350',roughness:.8,side:THREE.DoubleSide});
  for(const panel of roofPanels(h)){
    const positions=[...panel.points,...panel.points.map(([x,z,y])=>[x,z,y-.16])].flatMap(([x,z,y])=>[x,y,z]);
    const indices=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7];
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,roofMaterial);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=`roof:${panel.roomId}`;mesh.userData.roomId=panel.roomId;roof.add(mesh);
  }
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
