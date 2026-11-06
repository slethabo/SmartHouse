import { cleanPolygon, resolveRoofPanels, roofPlane, planeHeight, lineInterval } from './roofGeometry';
const EAVE_HEIGHT = 2.9;
const panelCache=new WeakMap();
const sectionCache=new WeakMap();
const edgeCache=new WeakMap();
const ROOF_OVERHANG = 0.3;
const ROOF_PITCH = Math.tan(Math.PI / 6);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function resolveRoofForm(house) {
  if (house.roofForm === 'Intersecting gables' || house.roofForm === 'Multi-hip') return house.roofForm;
  return house.style === 'Traditional' ? 'Multi-hip' : 'Intersecting gables';
}

function partitionFootprint(rooms) {
  const socialRooms = rooms.filter((room) => ['living', 'kitchen', 'dining', 'entertainment'].includes(room.type));
  const privateRooms = rooms.filter((room) => ['bedroom', 'dressing'].includes(room.type));
  const bounds = (items) => ({
    x0: Math.min(...items.map((room) => room.x)),
    x1: Math.max(...items.map((room) => room.x + room.width)),
    y0: Math.min(...items.map((room) => room.y)),
    y1: Math.max(...items.map((room) => room.y + room.depth)),
  });
  let functionalSplit = null;
  if (socialRooms.length && privateRooms.length) {
    const social = bounds(socialRooms), privateWing = bounds(privateRooms);
    const candidates = [
      { axis: 'x', before: 'social', coordinate: (social.x1 + privateWing.x0) / 2, separated: social.x1 <= privateWing.x0, overlap: Math.min(social.y1, privateWing.y1) - Math.max(social.y0, privateWing.y0) },
      { axis: 'x', before: 'private', coordinate: (privateWing.x1 + social.x0) / 2, separated: privateWing.x1 <= social.x0, overlap: Math.min(social.y1, privateWing.y1) - Math.max(social.y0, privateWing.y0) },
      { axis: 'y', before: 'social', coordinate: (social.y1 + privateWing.y0) / 2, separated: social.y1 <= privateWing.y0, overlap: Math.min(social.x1, privateWing.x1) - Math.max(social.x0, privateWing.x0) },
      { axis: 'y', before: 'private', coordinate: (privateWing.y1 + social.y0) / 2, separated: privateWing.y1 <= social.y0, overlap: Math.min(social.x1, privateWing.x1) - Math.max(social.x0, privateWing.x0) },
    ].filter((candidate) => candidate.separated && candidate.overlap > .1);
    if (candidates.length) {
      const selected = candidates.sort((a, b) => b.overlap - a.overlap || a.coordinate - b.coordinate)[0];
      functionalSplit = { ...selected, after: selected.before === 'social' ? 'private' : 'social' };
    }
  }
  const xs = [...new Set([...rooms.flatMap((room) => [room.x, room.x + room.width]), ...(functionalSplit?.axis === 'x' ? [functionalSplit.coordinate] : [])])].sort((a, b) => a - b);
  const ys = [...new Set([...rooms.flatMap((room) => [room.y, room.y + room.depth]), ...(functionalSplit?.axis === 'y' ? [functionalSplit.coordinate] : [])])].sort((a, b) => a - b);
  const rows = ys.length - 1;
  const columns = xs.length - 1;
  const zones = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
    if (!functionalSplit) return 'main';
    const coordinate = functionalSplit.axis === 'x'
      ? (xs[column] + xs[column + 1]) / 2
      : (ys[row] + ys[row + 1]) / 2;
    return coordinate < functionalSplit.coordinate ? functionalSplit.before : functionalSplit.after;
  }));
  const available = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
    const x = (xs[column] + xs[column + 1]) / 2;
    const y = (ys[row] + ys[row + 1]) / 2;
    return rooms.some((room) => x > room.x && x < room.x + room.width && y > room.y && y < room.y + room.depth);
  }));
  const sections = [];

  while (available.some((row) => row.some(Boolean))) {
    let best = null;
    for (let top = 0; top < rows; top++) {
      const validColumns = Array(columns).fill(true);
      for (let bottom = top; bottom < rows; bottom++) {
        let runStart = -1;
        for (let column = 0; column <= columns; column++) {
          validColumns[column] = column < columns && validColumns[column] && available[bottom][column]
            && zones[bottom][column] === zones[top][column];
          const sameZoneAsRun = runStart < 0 || column === columns || zones[bottom][column] === zones[bottom][runStart];
          if (validColumns[column] && sameZoneAsRun && runStart < 0) runStart = column;
          if ((!validColumns[column] || !sameZoneAsRun || column === columns) && runStart >= 0) {
            const x0 = xs[runStart];
            const x1 = xs[column];
            const y0 = ys[top];
            const y1 = ys[bottom + 1];
            const area = (x1 - x0) * (y1 - y0);
            if (!best || area > best.area) best = { top, bottom, left: runStart, right: column - 1, x0, x1, y0, y1, area, zone: zones[top][runStart] };
            runStart = validColumns[column] ? column : -1;
          }
        }
      }
    }
    if (!best) throw new Error('Could not partition the occupied house footprint into roof sections.');
    const roomIds = new Set();
    for (let row = best.top; row <= best.bottom; row++) {
      for (let column = best.left; column <= best.right; column++) {
        available[row][column] = false;
        const x = (xs[column] + xs[column + 1]) / 2;
        const y = (ys[row] + ys[row + 1]) / 2;
        const room = rooms.find((item) => x > item.x && x < item.x + item.width && y > item.y && y < item.y + item.depth);
        if (room) roomIds.add(room.id);
      }
    }
    sections.push({ ...best, roomIds: [...roomIds] });
  }
  return { sections, functionalSplit };
}

export function roofSections(house) {
  if(house.roofPlans)return house.roofPlans.flatMap(plan=>roofSections(plan).map(s=>({...s,id:`${plan.id}-${s.id}`,eaveHeight:s.eaveHeight+plan.elevation,ridgeHeight:s.ridgeHeight+plan.elevation})));
  if(house.roofPlan)return roofSections(house.roofPlan);
  if(!house.rooms.length)return [];
  if(sectionCache.has(house))return sectionCache.get(house);
  const form = resolveRoofForm(house);
  const partition = partitionFootprint(house.rooms);
  const sections=partition.sections.map((section, index) => {
    const x0 = section.x0 - ROOF_OVERHANG;
    const x1 = section.x1 + ROOF_OVERHANG;
    const y0 = section.y0 - ROOF_OVERHANG;
    const y1 = section.y1 + ROOF_OVERHANG;
    const width = x1 - x0;
    const depth = y1 - y0;
    const ridgeAxis = section.zone === 'private'
      ? (partition.functionalSplit.axis === 'x' ? 'y' : 'x')
      : (width >= depth ? 'x' : 'y');
    const ridgeCoordinate = ridgeAxis === 'x' ? (y0 + y1) / 2 : (x0 + x1) / 2;
    const ridgeLength = Math.max(0, (ridgeAxis === 'x' ? width - depth : depth - width));
    const rise = Math.min(width, depth) * ROOF_PITCH / 2;
    return {
      id: `roof-section-${index + 1}`,
      form,
      zone: section.zone,
      x0, x1, y0, y1, width, depth,
      buildingBounds: { x0: section.x0, x1: section.x1, y0: section.y0, y1: section.y1 },
      eaveHeight: EAVE_HEIGHT,
      ridgeHeight: EAVE_HEIGHT + rise,
      ridgeAxis,
      ridgeCoordinate,
      ridgeStart: ridgeAxis === 'x' ? x0 + (width - ridgeLength) / 2 : y0 + (depth - ridgeLength) / 2,
      ridgeEnd: ridgeAxis === 'x' ? x1 - (width - ridgeLength) / 2 : y1 - (depth - ridgeLength) / 2,
      roomIds: section.roomIds,
    };
  });
  sectionCache.set(house,sections);return sections;
}

export function sectionHeight(section, x, y) {
  if (section.form === 'Intersecting gables') {
    const span = section.ridgeAxis === 'x' ? section.depth : section.width;
    const offset = section.ridgeAxis === 'x' ? y - section.ridgeCoordinate : x - section.ridgeCoordinate;
    return section.eaveHeight + (section.ridgeHeight - section.eaveHeight) * clamp(1 - Math.abs(offset) / (span / 2), 0, 1);
  }
  const edgeDistance = Math.min(x - section.x0, section.x1 - x, y - section.y0, section.y1 - y);
  return section.eaveHeight + (section.ridgeHeight - section.eaveHeight)
    * clamp(edgeDistance / (Math.min(section.width, section.depth) / 2), 0, 1);
}

export function roofHeightAt(house, x, y) {
  const sections = roofSections(house).filter((section) => x >= section.x0 - .001 && x <= section.x1 + .001
    && y >= section.y0 - .001 && y <= section.y1 + .001);
  return sections.length ? Math.max(...sections.map((section) => sectionHeight(section, x, y))) : EAVE_HEIGHT;
}

export function roofHeight(house, _room, x, y) {
  return roofHeightAt(house, x, y ?? 0);
}

function point(x, y, z) {
  return [x, y, z];
}

function rawRoofPanels(house) {
  return roofSections(house).flatMap((section) => {
    const { x0, x1, y0, y1, ridgeAxis, ridgeCoordinate, ridgeStart, ridgeEnd, eaveHeight, ridgeHeight } = section;
    if (section.form === 'Intersecting gables') {
      if (ridgeAxis === 'x') return [
        { ...section, face: 'gable-front', points: [point(x0, y0, eaveHeight), point(x1, y0, eaveHeight), point(x1, ridgeCoordinate, ridgeHeight), point(x0, ridgeCoordinate, ridgeHeight)] },
        { ...section, face: 'gable-back', points: [point(x0, ridgeCoordinate, ridgeHeight), point(x1, ridgeCoordinate, ridgeHeight), point(x1, y1, eaveHeight), point(x0, y1, eaveHeight)] },
      ];
      return [
        { ...section, face: 'gable-left', points: [point(x0, y0, eaveHeight), point(ridgeCoordinate, y0, ridgeHeight), point(ridgeCoordinate, y1, ridgeHeight), point(x0, y1, eaveHeight)] },
        { ...section, face: 'gable-right', points: [point(ridgeCoordinate, y0, ridgeHeight), point(x1, y0, eaveHeight), point(x1, y1, eaveHeight), point(ridgeCoordinate, y1, ridgeHeight)] },
      ];
    }
    if (ridgeAxis === 'x') return [
      { ...section, face: 'hip-front', points: [point(x0, y0, eaveHeight), point(x1, y0, eaveHeight), point(ridgeEnd, ridgeCoordinate, ridgeHeight), point(ridgeStart, ridgeCoordinate, ridgeHeight)] },
      { ...section, face: 'hip-back', points: [point(ridgeStart, ridgeCoordinate, ridgeHeight), point(ridgeEnd, ridgeCoordinate, ridgeHeight), point(x1, y1, eaveHeight), point(x0, y1, eaveHeight)] },
      { ...section, face: 'hip-left', points: [point(x0, y0, eaveHeight), point(ridgeStart, ridgeCoordinate, ridgeHeight), point(x0, y1, eaveHeight)] },
      { ...section, face: 'hip-right', points: [point(x1, y0, eaveHeight), point(x1, y1, eaveHeight), point(ridgeEnd, ridgeCoordinate, ridgeHeight)] },
    ];
    return [
      { ...section, face: 'hip-front', points: [point(x0, y0, eaveHeight), point(ridgeCoordinate, ridgeStart, ridgeHeight), point(ridgeCoordinate, ridgeEnd, ridgeHeight), point(x0, y1, eaveHeight)] },
      { ...section, face: 'hip-back', points: [point(ridgeCoordinate, ridgeStart, ridgeHeight), point(x1, y0, eaveHeight), point(x1, y1, eaveHeight), point(ridgeCoordinate, ridgeEnd, ridgeHeight)] },
      { ...section, face: 'hip-left', points: [point(x0, y0, eaveHeight), point(x1, y0, eaveHeight), point(ridgeCoordinate, ridgeStart, ridgeHeight)] },
      { ...section, face: 'hip-right', points: [point(ridgeCoordinate, ridgeEnd, ridgeHeight), point(x1, y1, eaveHeight), point(x0, y1, eaveHeight)] },
    ];
  });
}

export function exteriorHeight(house, wall, x, y) {
  const px = x ?? wall.x;
  const py = y ?? wall.y;
  return roofHeightAt(house, px, py) - .12;
}

export function roofPanels(house) {
  if(house.roofPlans)return house.roofPlans.flatMap(plan=>roofPanels(plan).map(p=>({...p,id:`${plan.id}-${p.id}`,baseElevation:plan.elevation,
    points:p.points.map(([x,y,z])=>[x,y,z+plan.elevation])})));
  if(house.roofPlan)return roofPanels(house.roofPlan);
  if(!panelCache.has(house))panelCache.set(house,resolveRoofPanels(rawRoofPanels(house)));
  return [...panelCache.get(house)];
}

/** Include all roof-plane crossings so a wall follows ridges and valleys, not a
 * straight line between samples that could cut through a lower roof in between.
 */
export function exteriorWallProfile(house,wall) {
  const dx=wall.axis==='x'?1:0,dy=wall.axis==='y'?1:0,cuts=[0,wall.length],candidates=[];
  const midX=wall.x+dx*wall.length/2,midY=wall.y+dy*wall.length/2;
  if(house.upperCover?.some(r=>midX>=r.x-1e-5&&midX<=r.x+r.width+1e-5&&midY>=r.y-1e-5&&midY<=r.y+r.depth+1e-5))
    return [{offset:0,height:house.coveredWallHeight},{offset:wall.length,height:house.coveredWallHeight}];
  for(const panel of roofPanels(house)){
    const interval=lineInterval(panel.points,wall.x,wall.y,dx,dy);
    if(interval){
      candidates.push({interval,plane:roofPlane(panel.points)});
      for(const t of interval)if(t>0&&t<wall.length)cuts.push(t);
    }
  }
  const offsets=[...new Set(cuts.map(t=>+t.toFixed(8)))].sort((a,b)=>a-b);
  const profile=[];
  for(let i=0;i<offsets.length-1;i++){
    const mid=(offsets[i]+offsets[i+1])/2,x=wall.x+dx*mid,y=wall.y+dy*mid;
    const active=candidates.filter(c=>mid>c.interval[0]-1e-7&&mid<c.interval[1]+1e-7)
      .sort((a,b)=>planeHeight(b.plane,x,y)-planeHeight(a.plane,x,y))[0];
    for(const offset of [offsets[i],offsets[i+1]]){
      const height=active?planeHeight(active.plane,wall.x+dx*offset,wall.y+dy*offset)-.12:EAVE_HEIGHT-.12;
      const last=profile[profile.length-1];
      if(!last||Math.abs(last.offset-offset)>1e-7||Math.abs(last.height-height)>1e-7)profile.push({offset,height});
    }
  }
  return profile;
}

/** Sheet seams / tile courses clipped to the resolved visible roof patches. */
export function roofDetailSegments(panel) {
  const points=cleanPolygon(panel.points),plane=roofPlane(points),segments=[];
  const axis=panel.form==='Intersecting gables'?panel.ridgeAxis:panel.ridgeAxis==='x'?'y':'x';
  const spacing=panel.form==='Intersecting gables'?.85:.38;
  const coordinates=points.map(p=>p[axis==='x'?0:1]);
  const min=Math.min(...coordinates),max=Math.max(...coordinates);
  for(let value=Math.ceil(min/spacing)*spacing;value<max-1e-6;value+=spacing){
    const x=axis==='x'?value:0,y=axis==='y'?value:0,dx=axis==='y'?1:0,dy=axis==='x'?1:0;
    const interval=lineInterval(points,x,y,dx,dy);if(!interval)continue;
    segments.push(interval.map(t=>{const px=x+dx*t,py=y+dy*t;return [px,py,planeHeight(plane,px,py)+.012];}));
  }
  return segments;
}

/** Close stepped joins and outer eaves; never add full gables inside another roof. */
export function roofEdgeFaces(house) {
  if(house.roofPlans)return house.roofPlans.flatMap(plan=>roofEdgeFaces(plan).map(face=>({...face,baseElevation:plan.elevation,
    points:face.points.map(([x,y,z])=>[x,y,z+plan.elevation])})));
  if(house.roofPlan)return roofEdgeFaces(house.roofPlan);
  if(edgeCache.has(house))return edgeCache.get(house);
  const panels=roofPanels(house),planes=panels.map(p=>roofPlane(p.points)),faces=[];
  for(const [i,panel] of panels.entries())for(let e=0;e<panel.points.length;e++){
    const a=panel.points[e],b=panel.points[(e+1)%panel.points.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    if(length<1e-7)continue;
    const project=p=>((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(length*length);
    const onLine=p=>Math.abs(dx*(p[1]-a[1])-dy*(p[0]-a[0]))/length<1e-6;
    const neighbours=[],cuts=[0,1];
    for(const [j,other] of panels.entries())if(j!==i)for(let k=0;k<other.points.length;k++){
      const c=other.points[k],d=other.points[(k+1)%other.points.length];if(!onLine(c)||!onLine(d))continue;
      const lo=Math.max(0,Math.min(project(c),project(d))),hi=Math.min(1,Math.max(project(c),project(d)));
      if(hi-lo<1e-7)continue;neighbours.push({j,lo,hi});cuts.push(lo,hi);
    }
    const sorted=[...new Set(cuts.map(t=>+t.toFixed(8)))].sort((a,b)=>a-b);
    for(let k=0;k<sorted.length-1;k++){
      const lo=sorted[k],hi=sorted[k+1],mid=(lo+hi)/2;
      const neighbour=neighbours.find(n=>mid>n.lo-1e-7&&mid<n.hi+1e-7);
      if(neighbour&&i>neighbour.j)continue;
      const ends=[lo,hi].map(t=>[a[0]+dx*t,a[1]+dy*t]);
      const top=ends.map(([x,y])=>planeHeight(planes[i],x,y));
      const other=neighbour?ends.map(([x,y])=>planeHeight(planes[neighbour.j],x,y)):top.map(z=>z-.14);
      if(neighbour&&Math.max(...top.map((z,n)=>Math.abs(z-other[n])))<1e-6)continue;
      const bottom=ends.map(([x,y],n)=>[x,y,Math.min(top[n],other[n])]);
      const upper=ends.map(([x,y],n)=>[x,y,Math.max(top[n],other[n])]);
      faces.push({type:neighbour?'junction':'fascia',points:[bottom[0],bottom[1],upper[1],upper[0]]});
    }
  }
  edgeCache.set(house,faces);return faces;
}
