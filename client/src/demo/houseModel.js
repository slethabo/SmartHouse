import * as THREE from 'three';
import { placeFurniture } from './furniture';
import { selectFloor, FLOOR_HEIGHT } from './multiStorey';
import { roofPanels, roofSections, exteriorWallProfile, roofDetailSegments, roofEdgeFaces } from './architecture';

export function buildHouseModel(h) {
  if(!h.floors)return buildSingleHouseModel(h);
  const root=new THREE.Group();root.name='house';root.position.set(-h.width/2,0,-h.length/2);
  const floorGroups=h.floors.map(f=>{
    const model=buildSingleHouseModel(selectFloor(h,f.id));
    model.root.remove(model.roof);disposeHouseModel(model.roof);
    model.root.position.set(0,f.elevation,0);model.root.name=f.id;root.add(model.root);return {...model,level:f.level};
  });
  const stairGroups=h.stairs.map(link=>{const group=buildStair(link);root.add(group);return {group,level:link.elevation/FLOOR_HEIGHT};});
  const roof=createRoof(h);root.add(roof);
  return {root,roof,floorGroups,stairGroups,
    showAll(roofVisible=true){roof.visible=roofVisible;for(const f of floorGroups){f.root.visible=true;f.exterior.scale.y=1;f.interior.scale.y=1;}for(const s of stairGroups)s.group.visible=true;},
    setFloor(level){roof.visible=false;for(const f of floorGroups){f.root.visible=f.level<=level;f.exterior.scale.y=f.level===level?.28:1;f.interior.scale.y=f.level===level?.3:1;}
      for(const s of stairGroups)s.group.visible=s.level<=level;},
  };
}

function buildStair(link) {
  const group=new THREE.Group();group.name=link.id;group.userData=link;
  const material=new THREE.MeshStandardMaterial({color:'#bba88a',roughness:.8});
  const railMaterial=new THREE.MeshStandardMaterial({color:'#3b4b46',metalness:.45,roughness:.4});
  const scale=link.width/2.8,run=link.depth-2*link.landingDepth,going=run/8;
  function box(x,y,z,w,height,d,name){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,height,d),material);mesh.position.set(x+w/2,y+height/2,z+d/2);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
  const front=link.y+link.landingDepth,rear=link.y+link.depth-link.landingDepth;
  for(let i=0;i<9;i++){
    box(link.x+.2*scale,link.elevation+(i+1)*link.riser-.16,front+i*going,link.flightWidth,.16,going,'stair-tread');
    box(link.x+link.width-.2*scale-link.flightWidth,link.elevation+link.rise/2+(i+1)*link.riser-.16,rear-i*going-going,link.flightWidth,.16,going,'stair-tread');
  }
  box(link.x,link.elevation+link.rise/2-.16,rear,link.width,.16,link.landingDepth,'stair-turn-landing');
  function rail(a,b,name='stair-handrail'){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const mesh=new THREE.Mesh(name==='stair-stringer'?new THREE.BoxGeometry(.1,delta.length(),.14):new THREE.CylinderGeometry(.025,.025,delta.length(),8),name==='stair-stringer'?material:railMaterial);
    mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());mesh.name=name;group.add(mesh);}
  rail([link.x+.12*scale,link.elevation+link.riser+.95,front],[link.x+.12*scale,link.elevation+link.rise/2+.95,rear]);
  rail([link.x+link.width-.12*scale,link.elevation+link.rise+.95,front],[link.x+link.width-.12*scale,link.elevation+link.rise/2+link.riser+.95,rear]);
  for(const offset of [.25*scale,1.2*scale]){
    rail([link.x+offset,link.elevation+link.riser-.2,front],[link.x+offset,link.elevation+link.rise/2-.2,rear],'stair-stringer');
    rail([link.x+link.width-offset,link.elevation+link.rise-.2,front],[link.x+link.width-offset,link.elevation+link.rise/2+link.riser-.2,rear],'stair-stringer');
  }
  for(const i of [0,3,6,8]){
    const z=front+i*going,left=link.elevation+(i+1)*link.riser,right=link.elevation+link.rise-i*link.riser;
    rail([link.x+.12*scale,left,z],[link.x+.12*scale,left+.95,z],'stair-guard-post');
    rail([link.x+link.width-.12*scale,right,z],[link.x+link.width-.12*scale,right+.95,z],'stair-guard-post');
  }
  return group;
}

/** Build real meshes from the shared floor-plan geometry. No network assets. */
function buildSingleHouseModel(h) {
  const root = new THREE.Group();
  root.name = 'house'; root.position.set(-h.width / 2, 0, -h.length / 2);
  const exterior = new THREE.Group(); exterior.name = 'exterior-walls'; root.add(exterior);
  const interior = new THREE.Group(); interior.name = 'interior-walls'; root.add(interior);
  const roof=createRoof(h);root.add(roof);
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
  function wall(group, x, z, length, axis, openings = [], profile = [{offset:0,height:2.8},{offset:length,height:2.8}]) {
    if (length <= .01) return;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(length, 0);
    for(const p of [...profile].reverse())shape.lineTo(p.offset,p.height);
    shape.closePath();
    for (const o of openings) {
      const start = Math.max(.001, o.start), end = Math.min(length - .001, o.start + o.length);
      if (end <= start) continue;
      const hole = new THREE.Path();
      hole.moveTo(start, o.bottom); hole.lineTo(start, o.top); hole.lineTo(end, o.top); hole.lineTo(end, o.bottom); hole.closePath();
      shape.holes.push(hole);
    }
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .16, bevelEnabled: false }), wallMaterial);
    mesh.name = 'wall'; mesh.userData = { axis, length, openings, profile, planX:x, planY:z };
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
    wall(segment.exterior ? exterior : interior, segment.x, segment.y, segment.length, axis === 'x' ? 'x' : 'z', openings,
      segment.exterior ? exteriorWallProfile(h,segment) : undefined);
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
  for (const d of h.doors.filter(door=>door.entrance||door.garage||door.terrace)) {
    const alongX=d.axis==='x',height=d.garage?2.4:2.15;
    box(exterior,d.x-(alongX?0:.07),0,d.y-(alongX?.07:0),alongX?d.length:.14,height,alongX?.14:d.length,d.garage?trim:timber,d.garage?'garage-door':'entrance');
    if(d.entrance)box(exterior,d.x-.25,2.4,d.y-.3,alongX?d.length+.5:.7,.12,alongX?.7:d.length+.5,trim,'entrance-canopy');
  }
  for(const r of h.rooms){const depth=r.type==='stairs'&&h.opening?h.opening.y-r.y:r.depth;box(root,r.x,h.level>0?-.2:-.15,r.y,r.width,h.level>0?.2:.15,depth,'#b5aea0',`foundation:${r.id}`);}
  for(const t of h.terraces||[]){
    box(root,t.x,-.04,t.y,t.width,.08,t.depth,'#c4b69c','terrace');
    for(let z=t.y+.15;z<t.y+t.depth;z+=.22)box(root,t.x,.005,z,t.width,.01,.015,'#aa9b83','deck-joint');
    if(t.level>0)for(const edge of t.guardEdges||[]){
      const alongX=edge==='back',x=alongX?t.x:t.x+t.width,z=alongX?t.y+t.depth:t.y,span=alongX?t.width:t.depth;
      box(root,x-.03,.1,z-.03,alongX?span:.06,1,alongX?.06:span,glass,'terrace-guard');
      box(root,x-.04,1.1,z-.04,alongX?span:.08,.06,alongX?.08:span,trim,'terrace-guard-rail');
      const count=Math.ceil(span/1.2);
      for(let i=0;i<=count;i++)box(root,x+(alongX?span*i/count:0)-.03,.04,z+(alongX?0:span*i/count)-.03,.06,1.12,.06,trim,'terrace-guard-post');
    }
  }
  const roomColours = { living: '#decfae', kitchen: '#d6d2c7', bedroom: '#dfc9a7', bathroom: '#cbdde0', office: '#d8cfdf', utility: '#d8d8ca', hall: '#e8dfcb', dining: '#ddceb5', entertainment: '#d8cfbd', dressing: '#d4c9bc', garage: '#b9bdba' };
  for (const r of h.rooms) {
    const floor = box(root, r.x, .005, r.y, r.width, .03, r.type==='stairs'&&h.opening?h.opening.y-r.y:r.depth, roomColours[r.type]||'#ded7c8', `floor:${r.id}`);
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
  return { root, exterior, interior, roof, furniture };
}


function polygon(group, points, material, name) {
  if (points.length < 3) return;
  const positions = points.flatMap(([x,y,z]) => [x,y,z]);
  const indices = [];
  for (let index = 1; index < points.length - 1; index++) indices.push(0,index,index+1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry,material);
  mesh.name=name; mesh.castShadow=true; mesh.receiveShadow=true; group.add(mesh);
  return mesh;
}

function createRoof(h) {
  const roof=new THREE.Group();roof.name='roof';
  const roofForm=roofSections(h)[0]?.form;
  const roofMaterial=new THREE.MeshStandardMaterial({
    color:roofForm==='Multi-hip'?'#a95e42':'#58666b',
    roughness:roofForm==='Multi-hip'?.88:.38,
    metalness:roofForm==='Multi-hip'?.02:.72,
    side:THREE.DoubleSide,
  });
  const roofDetailMaterial=new THREE.LineBasicMaterial({color:roofForm==='Multi-hip'?'#734433':'#34454c'});
  const linePoints=[];
  for(const panel of roofPanels(h)){
    const points=panel.points.map(([x,z,y])=>[x,y,z]);
    const mesh=polygon(roof,points,roofMaterial,`roof:${panel.id}:${panel.face}:${panel.patch}`);
    if(mesh)mesh.userData={sectionId:panel.id,face:panel.face,roomIds:panel.roomIds,roofForm:panel.form};
    for(const segment of roofDetailSegments(panel))for(const [x,z,y] of segment)linePoints.push([x,y,z]);
  }
  for(const face of roofEdgeFaces(h))polygon(roof,face.points.map(([x,z,y])=>[x,y,z]),roofMaterial,`roof-${face.type}`);

  if(linePoints.length){
    const geometry=new THREE.BufferGeometry().setFromPoints(linePoints.map(([x,y,z])=>new THREE.Vector3(x,y,z)));
    const details=new THREE.LineSegments(geometry,roofDetailMaterial);
    details.name=roofForm==='Multi-hip'?'roof-tile-courses':'roof-standing-seams';
    roof.add(details);
  }
  return roof;
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
