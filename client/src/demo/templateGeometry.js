import { placeFurniture } from './furniture';

const EPS=.001,round=n=>+n.toFixed(4);
const LEAF=.8,JAMB=.15;
/** Higher ranks receive the door swing: a bathroom door opens into the bathroom, never into the hall. */
const SWING_RANK={hall:0,living:1,kitchen:1,dining:1,entertainment:1,garage:2,bedroom:3,office:3,utility:3,dressing:4,bathroom:5};

const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y));

/** Places a hinged leaf on a wall span. Tries both corners, then the centre, and keeps the
 * position whose quarter-circle swing clashes least with furniture and earlier doors in the room.
 * `hinge` is the end of the opening the leaf hangs from; `swing` is +1/-1 along the wall normal. */
function placeLeaf(axis,x,y,span,swing,obstacles=[],leaf=LEAF){
  const options=[[JAMB,'start'],[span-JAMB-leaf,'end'],[(span-leaf)/2,'start']];
  let best;
  for(const [offset,hinge] of options){
    const along=(axis==='x'?x:y)+offset,across=axis==='x'?y:x;
    const sweep=axis==='x'?{x:along,y:swing>0?across:across-leaf,w:leaf,d:leaf}:{x:swing>0?across:across-leaf,y:along,w:leaf,d:leaf};
    const clash=obstacles.reduce((sum,o)=>sum+overlap(sweep,o),0);
    if(!best||clash<best.clash-EPS)best={clash,offset,hinge,sweep};
  }
  obstacles.push(best.sweep);
  return {axis,x:round(x+(axis==='x'?best.offset:0)),y:round(y+(axis==='y'?best.offset:0)),length:round(leaf),hinge:best.hinge,swing};
}

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
  // Swing areas already claimed in each room, so leaves avoid furniture and each other.
  const claimed=new Map(rooms.map(r=>[r.id,placeFurniture(r).map(f=>({x:f.x,y:f.y,w:f.width,d:f.depth}))]));
  for(const e of edges.sort((a,b)=>a.priority-b.priority)){
    if(find(e.a.id)===find(e.b.id))continue;parent.set(find(e.a.id),find(e.b.id));
    if(e.open){
      const size=Math.min(2.8,e.span-.25),offset=(e.span-size)/2;
      doors.push({axis:e.axis,x:round(e.x+(e.axis==='x'?offset:0)),y:round(e.y+(e.axis==='y'?offset:0)),length:round(size),
        opening:true,connects:[e.a.id,e.b.id]});
      continue;
    }
    // Hinged doors open into the more private room, hinged beside a corner where possible.
    const into=(SWING_RANK[e.b.type]??1)>(SWING_RANK[e.a.type]??1)?e.b:e.a;
    const swing=e.axis==='x'?(into.y>=e.y-EPS?1:-1):(into.x>=e.x-EPS?1:-1);
    doors.push({...placeLeaf(e.axis,e.x,e.y,e.span,swing,claimed.get(into.id)),swingInto:into.id,opening:false,connects:[e.a.id,e.b.id]});
  }
  if(new Set(rooms.map(r=>find(r.id))).size!==1)throw new Error('A source-plan room has no circulation connection.');
  const exterior=walls.filter(w=>w.exterior);
  const opening=(r,garage=false)=>{
    const candidates=exterior.filter(w=>w.roomId===r.id&&w.length>(garage?2:1.1)).sort((a,b)=>
      (a.edge==='front'?-100:0)-(b.edge==='front'?-100:0)||b.length-a.length);
    const w=candidates[0];if(!w)throw new Error(`${r.name} has no exterior entrance.`);
    if(!garage){
      // Front doors swing inwards, away from the weather.
      const swing=w.edge==='front'||w.edge==='left'?1:-1;
      doors.push({...placeLeaf(w.axis,w.x,w.y,w.length,swing,claimed.get(r.id),.9),swingInto:r.id,edge:w.edge,entrance:true,garage:false,connects:['outside',r.id]});
      return;
    }
    const size=Math.min(4.8,w.length-.6),offset=(w.length-size)/2;
    doors.push({axis:w.axis,x:round(w.x+(w.axis==='x'?offset:0)),y:round(w.y+(w.axis==='y'?offset:0)),length:round(size),
      edge:w.edge,entrance:false,garage:true,connects:['outside',r.id]});
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
