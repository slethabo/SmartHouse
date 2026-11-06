import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildHouseModel, disposeHouseModel } from '../../demo/houseModel';
import { HouseElevation } from './HouseElevation';

export default function House3DView({ house }) {
  const mount = useRef(null);
  const viewer = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [cutaway, setCutaway] = useState(false);
  const [retry, setRetry] = useState(0);
  const [floorSelection,setFloorSelection]=useState('all');
  useEffect(() => {
    const host = mount.current;
    let renderer, scene, controls, observer;
    setReady(false); setError(''); setCutaway(false);setFloorSelection('all');
    const cleanup = () => {
      observer?.disconnect(); controls?.dispose();
      if (scene) disposeHouseModel(scene);
      if (renderer) { renderer.domElement.removeEventListener('webglcontextlost', lost); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); }
      viewer.current = null;
    };
    const lost = (event) => { event.preventDefault(); setError('The 3D view paused because graphics resources became unavailable. You can retry or use the exterior views.'); setReady(false); };
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute('aria-label', 'Interactive 3D house. Drag to rotate, scroll or pinch to zoom. View controls are available above.');
      renderer.domElement.setAttribute('role', 'img');
      renderer.domElement.addEventListener('webglcontextlost', lost);
      host.appendChild(renderer.domElement);
      scene = new THREE.Scene(); scene.background = new THREE.Color('#e8eee5');
      const camera = new THREE.PerspectiveCamera(40, 1, .1, 300);
      const model = buildHouseModel(house); scene.add(model.root);
      scene.add(new THREE.HemisphereLight('#fff8e9', '#798574', 2.3));
      const sun = new THREE.DirectionalLight('#fff4df', 3); sun.position.set(-12, 22, -14); sun.castShadow = true;
      const reach = Math.max(house.width, house.length) + 8;
      Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 100 });
      sun.shadow.mapSize.set(1024,1024); sun.shadow.bias = -.0004; scene.add(sun);
      const ground = new THREE.Mesh(new THREE.BoxGeometry(house.width + 6, .15, house.length + 7), new THREE.MeshStandardMaterial({ color: '#aabb96', roughness: 1 }));
      ground.position.y = -.24; ground.receiveShadow = true; scene.add(ground);
      const path = new THREE.Mesh(new THREE.BoxGeometry(1.6, .08, 3), new THREE.MeshStandardMaterial({ color: '#c8bfaa' }));
      const entrance = house.doors.find((door) => door.entrance);
      const direction={front:[0,-1],back:[0,1],left:[-1,0],right:[1,0]}[entrance.edge];
      if(entrance.axis==='y')path.rotation.y=Math.PI/2;
      path.position.set(entrance.x+(entrance.axis==='x'?entrance.length/2:0)+direction[0]*1.5-house.width/2,-.1,
        entrance.y+(entrance.axis==='y'?entrance.length/2:0)+direction[1]*1.5-house.length/2); path.receiveShadow = true; scene.add(path);
      for (const x of [-house.width / 2 - 1.3, house.width / 2 + 1.3]) {
        const tree = new THREE.Mesh(new THREE.SphereGeometry(.7,12,8),new THREE.MeshStandardMaterial({ color: '#6d8b58', roughness: 1 }));
        tree.position.set(x,.5,-house.length / 2 + 1); tree.castShadow = true; scene.add(tree);
      }
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false; controls.maxPolarAngle = Math.PI / 2 - .04; controls.minPolarAngle = .05;
      const buildingHeight=(house.storeys||1)*(house.floorHeight||3.2);
      let focusY=buildingHeight/2;
      const radius = Math.hypot(house.width, house.length,buildingHeight);
      controls.minDistance = radius * .45; controls.maxDistance = radius * 4;
      controls.target.set(0,1,0);
      const render = () => { if (host.clientWidth > 0) renderer.render(scene,camera); };
      const preset = (name) => {
        const distance = radius * 1.25 / Math.min(1, camera.aspect);
        if (name === 'front') camera.position.set(0,focusY+3,-distance);
        else if (name === 'top') camera.position.set(0,focusY+distance,.01);
        else camera.position.set(distance * .65,focusY+distance * .55,-distance * .75);
        controls.target.set(0,focusY,0); controls.update(); render();
      };
      const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w,h,false); camera.aspect = w/h; camera.updateProjectionMatrix(); render(); };
      controls.addEventListener('change',render);
      observer = new ResizeObserver(resize); observer.observe(host); resize(); preset('angle');
      viewer.current = { preset, render, model,
        focusFloor(level){model.setFloor(level);focusY=level*house.floorHeight+.7;preset('top');},
        showAll(){model.showAll();focusY=buildingHeight/2;preset('angle');},
        rotate: (direction) => { const offset = camera.position.clone().sub(controls.target); offset.applyAxisAngle(new THREE.Vector3(0,1,0), direction * Math.PI / 6); camera.position.copy(controls.target).add(offset); controls.update(); }, zoom: (factor) => { const offset = camera.position.clone().sub(controls.target); offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance)); camera.position.copy(controls.target).add(offset); controls.update(); } };
      setReady(true);
    } catch {
      cleanup(); setError('3D graphics are unavailable in this browser. You can still explore the front and side exterior previews.');
    }
    return cleanup;
  }, [house, retry]);
  function toggleRoof() {
    const v = viewer.current; if (!v) return;
    const next = !cutaway; setCutaway(next);
    if(v.model.setFloor){
      if(next){setFloorSelection(String(house.storeys-1));v.focusFloor(house.storeys-1);}
      else{setFloorSelection('all');v.showAll();}
      return;
    }
    v.model.roof.visible = !next; v.model.exterior.scale.y = next ? .28 : 1; v.model.interior.scale.y = next ? .3 : 1;
    if (next) v.preset('top'); else v.preset('angle'); v.render();
  }
  return <div className="house-3d-view"><div className="house-3d-toolbar"><div className="house-angle-switch" aria-label="3D camera views">{[['angle','Overview'],['front','Front'],['top','Above']].map(([key,label]) => <button key={key} type="button" disabled={!ready} onClick={() => viewer.current?.preset(key)}>{label}</button>)}</div><button type="button" className="btn btn--secondary btn--sm" disabled={!ready} aria-pressed={cutaway} onClick={toggleRoof}>{cutaway ? 'Replace roof' : 'Remove roof'}</button></div>
    {house.floors&&<label className="house-floor-selector">Inspect floor <select aria-label="Inspect floor in 3D" value={floorSelection} disabled={!ready} onChange={e=>{
      const value=e.target.value;setFloorSelection(value);setCutaway(value!=='all');
      if(value==='all')viewer.current.showAll();else viewer.current.focusFloor(Number(value));
    }}><option value="all">Whole building</option>{house.floors.map(f=><option key={f.id} value={f.level}>{f.name}</option>)}</select></label>}
    <div className="house-3d-canvas" ref={mount} hidden={Boolean(error)} />
    {!ready && !error && <p role="status">Preparing your 3D home...</p>}
    {error && <div className="house-3d-fallback"><p role="status">{error}</p><button type="button" className="btn btn--secondary" onClick={() => setRetry((n) => n + 1)}>Retry 3D</button><HouseElevation house={house} /></div>}
    <div className="house-3d-controls"><span>Drag to rotate / Scroll or pinch to zoom</span><div><button type="button" disabled={!ready} aria-label="Rotate house left" onClick={() => viewer.current?.rotate(-1)}>Rotate left</button><button type="button" disabled={!ready} aria-label="Rotate house right" onClick={() => viewer.current?.rotate(1)}>Rotate right</button><button type="button" disabled={!ready} aria-label="Zoom in" onClick={() => viewer.current?.zoom(.85)}>+</button><button type="button" disabled={!ready} aria-label="Zoom out" onClick={() => viewer.current?.zoom(1.15)}>-</button></div></div>
  </div>;
}
