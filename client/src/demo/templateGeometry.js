const EPS=.001,round=n=>+n.toFixed(4);

/** Exact union boundary of the occupied room rectangles, including setbacks and courtyards. */
export function roomBoundaries(rooms) {
  const groups=new Map();
  function add(axis,c,start,length,room,side){
    const key=`${axis}:${round(c)}`;if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push({start:round(start),end:round(start+length),room,side});
  }
  for(const r of rooms){
    add('x',r.y,r.x,r.width,r,'front');add('x',r.y+r.depth,r.x,r.width,r,'back');
    add('y',r.x,r.y,r.depth,r,'left');add('y',r.x+r.width,r.y,r.depth,r,'right');
  }
  const walls=[];
  for(const [key,ranges] of groups){
    const [axis,c]=key.split(':'),points=[...new Set(ranges.flatMap(r=>[r.start,r.end]))].sort((a,b)=>a-b);
    for(let i=0;i<points.length-1;i++){
      const start=points[i],end=points[i+1],mid=(start+end)/2;
      const owners=ranges.filter(r=>mid>r.start-EPS&&mid<r.end+EPS);if(!owners.length)continue;
      walls.push({axis,x:axis==='x'?start:+c,y:axis==='x'?+c:start,length:round(end-start),exterior:owners.length===1,
        edge:owners.length===1?owners[0].side:undefined,roomId:owners[0].room.id,roomIds:owners.map(o=>o.room.id)});
    }
  }
  return walls;
}

export function connectRooms({rooms},entranceRoomId) {
  const walls=roomBoundaries(rooms),edges=[];
  for(let i=0;i<rooms.length;i++)for(let j=i+1;j<rooms.length;j++){
    const a=rooms[i],b=rooms[j];
    if((a.privateTo&&a.privateTo!==b.id)||(b.privateTo&&b.privateTo!==a.id))continue;
    const dy=Math.min(a.y+a.depth,b.y+b.depth)-Math.max(a.y,b.y),dx=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x);
    let e;
    if(dy>=1.1&&(Math.abs(a.x+a.width-b.x)<EPS||Math.abs(b.x+b.width-a.x)<EPS))e={axis:'y',x:Math.max(a.x,b.x),y:Math.max(a.y,b.y),span:dy};
    if(dx>=1.1&&(Math.abs(a.y+a.depth-b.y)<EPS||Math.abs(b.y+b.depth-a.y)<EPS))e={axis:'x',x:Math.max(a.x,b.x),y:Math.max(a.y,b.y),span:dx};
    if(e){const pub=['living','kitchen','dining','entertainment','hall'];
      edges.push({...e,a,b,open:pub.includes(a.type)&&pub.includes(b.type)&&(a.type!=='kitchen'||a.openKitchen)&&(b.type!=='kitchen'||b.openKitchen),
        priority:a.type==='hall'||b.type==='hall'?0:pub.includes(a.type)||pub.includes(b.type)?1:2});}
  }
  const parent=new Map(rooms.map(r=>[r.id,r.id])),find=id=>parent.get(id)===id?id:find(parent.get(id)),doors=[];
  for(const e of edges.sort((a,b)=>a.priority-b.priority)){
    if(find(e.a.id)===find(e.b.id))continue;parent.set(find(e.a.id),find(e.b.id));
    const size=e.open?Math.min(2.8,e.span-.25):.9,offset=(e.span-size)/2;
    doors.push({axis:e.axis,x:round(e.x+(e.axis==='x'?offset:0)),y:round(e.y+(e.axis==='y'?offset:0)),length:round(size),
      side:e.axis==='y'&&e.a.type==='hall'?'right':'left',opening:e.open,connects:[e.a.id,e.b.id]});
  }
  if(new Set(rooms.map(r=>find(r.id))).size!==1)throw new Error('A source-plan room has no circulation connection.');
  const exterior=walls.filter(w=>w.exterior);
  const opening=(r,garage=false)=>{
    const candidates=exterior.filter(w=>w.roomId===r.id&&w.length>(garage?2:1.1)).sort((a,b)=>
      (a.edge==='front'?-100:0)-(b.edge==='front'?-100:0)||b.length-a.length);
    const w=candidates[0];if(!w)throw new Error(`${r.name} has no exterior entrance.`);
    const size=garage?Math.min(4.8,w.length-.6):1,offset=(w.length-size)/2;
    doors.push({axis:w.axis,x:round(w.x+(w.axis==='x'?offset:0)),y:round(w.y+(w.axis==='y'?offset:0)),length:round(size),
      edge:w.edge,entrance:!garage,garage,connects:['outside',r.id]});
  };
  opening(rooms.find(r=>r.id===entranceRoomId));
  rooms.filter(r=>r.type==='garage').forEach(r=>opening(r,true));
  const windows=[];
  for(const r of rooms){
    if(['hall','garage','dressing','utility'].includes(r.type))continue;
    const candidates=exterior.filter(w=>w.roomId===r.id).sort((a,b)=>b.length-a.length);
    for(const w of candidates){
      const size=Math.min(r.type==='bathroom'?.8:['living','kitchen'].includes(r.type)?2.6:1.8,w.length-.6);
      if(size<.6)continue;const x=round(w.x+(w.axis==='x'?(w.length-size)/2:0)),y=round(w.y+(w.axis==='y'?(w.length-size)/2:0));
      if(doors.some(d=>d.axis===w.axis&&Math.abs((d.axis==='x'?d.y:d.x)-(w.axis==='x'?y:x))<EPS&&
        Math.min((d.axis==='x'?d.x:d.y)+d.length,(w.axis==='x'?x:y)+size)-Math.max(d.axis==='x'?d.x:d.y,w.axis==='x'?x:y)>-.2))continue;
      windows.push({axis:w.axis,x,y,length:round(size),edge:w.edge,roomId:r.id});break;
    }
  }
  return {walls,doors,windows};
}
