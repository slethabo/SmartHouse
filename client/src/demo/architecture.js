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
  const panels=[];
  for(const r of h.rooms){
    const cuts=[r.x,r.x+r.width];
    const ridge=h.width*(h.style==='Traditional'?.5:.55);
    if((h.style==='Traditional'||h.roofDesign==='butterfly')&&ridge>r.x&&ridge<r.x+r.width)cuts.splice(1,0,ridge);
    for(let i=0;i<cuts.length-1;i++){
      const x=cuts[i],end=cuts[i+1];
      panels.push({roomId:r.id,zone:r.zone,points:[[x,r.y,roofHeight(h,r,x)],[end,r.y,roofHeight(h,r,end)],
        [end,r.y+r.depth,roofHeight(h,r,end)],[x,r.y+r.depth,roofHeight(h,r,x)]]});
    }
  }
  return panels;
}

export function exteriorHeight(h,wall,x=wall.x) {
  return roofHeight(h,h.rooms.find(r=>r.id===wall.roomId),x)-.12;
}
