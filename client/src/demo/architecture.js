/** Roof and facade geometry shared by SVG drawings and the interactive model. */
export function roofHeight(h,room,x) {
  if(h.style==='Traditional') {
    const ridge=h.width*.5;
    return 3+Math.max(0,1-Math.abs(x-ridge)/(h.width*.5));
  }
  if(h.style==='Minimalist')return room.zone==='public'?3.35:3;
  if(h.roofDesign==='mono-pitch')return 3+x*.075;
  if(h.roofDesign==='butterfly')return 3+Math.abs(x-h.width*.55)*.09;
  return room.zone==='public'?3.55:room.zone==='garage'?2.95:room.zone==='private'?3.2:3.05;
}

export function roofPanels(h) {
  const xs=[...new Set(h.rooms.flatMap(r=>[r.x,r.x+r.width]))].sort((a,b)=>a-b);
  const ys=[...new Set(h.rooms.flatMap(r=>[r.y,r.y+r.depth]))].sort((a,b)=>a-b);
  const ridge=h.width*(h.style==='Traditional'?.5:.55);
  if((h.style==='Traditional'||h.roofDesign==='butterfly')&&ridge>xs[0]&&ridge<xs.at(-1))xs.push(ridge);
  xs.sort((a,b)=>a-b);
  const panels=[];
  for(let ix=0;ix<xs.length-1;ix++)for(let iy=0;iy<ys.length-1;iy++){
    const x=xs[ix],endX=xs[ix+1],y=ys[iy],endY=ys[iy+1],mx=(x+endX)/2,my=(y+endY)/2;
    const room=h.rooms.find(r=>mx>r.x-.001&&mx<r.x+r.width+.001&&my>r.y-.001&&my<r.y+r.depth+.001);
    if(!room)continue;
    panels.push({ix,iy,roomId:room.id,zone:room.zone,room,x,endX,y,endY,
      points:[[x,y,roofHeight(h,room,x)],[endX,y,roofHeight(h,room,endX)],
        [endX,endY,roofHeight(h,room,endX)],[x,endY,roofHeight(h,room,x)]]});
  }
  return panels;
}

export function exteriorHeight(h,wall,x=wall.x) {
  return roofHeight(h,h.rooms.find(r=>r.id===wall.roomId),x)-.12;
}
