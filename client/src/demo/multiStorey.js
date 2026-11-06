import { connectRooms } from './templateGeometry';

export const FLOOR_HEIGHT=3.2;
export const MULTI_STOREY_ALLOWANCES={stairPerConnection:25000,upperStructurePerM2:1800};
const round=n=>+n.toFixed(4);

/** Authored multi-level adaptations, not reconstructions of multi-storey scans.
 * A continuous service/stair core and aligned wing bays establish a load-path
 * concept. Member sizing, fire escape and structural certification are excluded.
 */
export function buildMultiStoreyLayout(answers,template) {
  const storeys=Number(answers.storeys||1);
  if(![2,3].includes(storeys))throw new Error('Choose two or three storeys.');
  const scale={Compact:.94,Balanced:1,Generous:1.15}[answers.spaceLevel]||1;
  const features=answers.homeFeatures||[],has=f=>features.includes(f),suite=has('Main en-suite')||has('Walk-in wardrobe');
  const leftWidth=(has('Double garage')?5.8:template.recipe==='linear'?3.6:4.4)*scale;
  const rightWidth=(template.recipe==='linear'?3.8:4.4)*scale,coreWidth=5.6*scale,hallWidth=1.4*scale;
  const bayDepth=(has('Double garage')?6:4.8)*scale;
  const rightX=leftWidth+coreWidth,coreRoomX=leftWidth+hallWidth,coreRoomWidth=coreWidth-2*hallWidth;
  const programs=Array.from({length:storeys},()=>[]),sharedBaths=Array(storeys).fill(0);
  const descriptor=(name,type,zone='public')=>({name,type,zone});
  programs[0].push(descriptor(answers.kitchen==='Separate'?'Living room':'Living / kitchen','living'));
  if(answers.kitchen==='Separate')programs[0].push(descriptor('Kitchen','kitchen'));
  if(has('Separate dining room'))programs[0].push(descriptor('Dining room','dining'));
  if(has('Entertainment room'))programs[0].push(descriptor('Entertainment room','entertainment'));
  if(has('Double garage'))programs[0].push({...descriptor('Double garage','garage','garage'),forced:'left-front'});
  if(answers.workFromHome==='Yes'&&answers.office==='Dedicated quiet office')programs[0].push(descriptor('Office','office','service'));
  programs[storeys-1].push({...descriptor('Main bedroom','bedroom','private'),forced:'right-front',main:true});
  for(let i=2;i<=Number(answers.bedrooms);i++){
    // Keep one downstairs bedroom for larger families; otherwise allocate upstairs.
    const level=i===2&&Number(answers.bedrooms)>=4?0:1+(i-2)%(storeys-1);
    programs[level].push(descriptor(`Bedroom ${i}`,'bedroom','private'));
  }
  const sharedCount=Number(answers.bathrooms)-Number(has('Main en-suite'));
  for(let i=0;i<sharedCount;i++)sharedBaths[i%storeys]++;
  if(suite)for(let level=0;level<storeys-1;level++)programs[level].push({...descriptor('Family landing','hall'),forced:'right-front'});
  const coreBaths=sharedBaths.map((n,level)=>Math.max(0,n-Number(suite&&level<storeys-1&&n>0)));
  const capacity=rows=>rows*2-(template.recipe==='split'?1:0);
  const floorRows=programs.map((p,level)=>{
    let rows=2;while(capacity(rows)<p.length||rows*bayDepth<(6.2*scale+Math.max(1,coreBaths[level])*2.8*scale))rows++;return rows;
  });
  // Upper floor plates stay within the supported plate below.
  for(let level=storeys-2;level>=0;level--)floorRows[level]=Math.max(floorRows[level],floorRows[level+1]);
  const length=round(floorRows[0]*bayDepth),width=round(rightX+rightWidth+(suite?2.8*scale:0));
  const floors=[],stairs=[];
  let bathroomNumber=0;
  for(let level=0;level<storeys;level++){
    const rows=floorRows[level],floorLength=round(rows*bayDepth);
    const id=`floor-${level}`,name=level===0?'Ground floor':level===1?'First floor':'Second floor',rooms=[],terraces=[];
    const add=(name,type,x,y,w,d,zone='public',extra={})=>{
      const room={id:`${id}-room-${rooms.length+1}`,name,type,x:round(x),y:round(y),width:round(w),depth:round(d),zone,floorId:id,level,elevation:level*FLOOR_HEIGHT,...extra};
      room.area=+(w*d).toFixed(2);rooms.push(room);return room;
    };
    const hall=add('Gallery','hall',leftWidth,0,hallWidth,floorLength);
    add('Bedroom gallery','hall',rightX-hallWidth,0,hallWidth,floorLength);
    const lobby=add('Stair landing','hall',coreRoomX,0,coreRoomWidth,1.4*scale);
    const stair=add('Stairs','stairs',coreRoomX,1.4*scale,coreRoomWidth,4.8*scale,'service',{accessVia:lobby.id,up:level<storeys-1,down:level>0});
    const slots=[];
    for(let row=0;row<rows;row++)for(const side of ['left','right']){
      if(template.recipe==='split'&&side==='left'&&row===floorRows[0]-1)continue;
      slots.push({side,row,x:side==='left'?0:rightX,y:row*bayDepth,width:side==='left'?leftWidth:rightWidth,depth:bayDepth});
    }
    const pending=[...programs[level]],assigned=new Map();
    for(const p of pending.filter(p=>p.forced)){
      const slot=slots.find(s=>s.row===0&&s.side===(p.forced==='left-front'?'left':'right'));assigned.set(slot,p);
    }
    const others=pending.filter(p=>!p.forced);
    for(const slot of slots)if(!assigned.has(slot)&&others.length)assigned.set(slot,others.shift());
    let main;
    const balconySlot=level>0&&level===storeys-1&&template.recipe==='wide'
      ?slots.find(s=>s.side==='right'&&s.row===rows-1&&!assigned.has(s)):null;
    for(const slot of slots){
      if(slot===balconySlot){terraces.push({...slot,id:`${id}-terrace`,name:'Roof terrace',level,elevation:level*FLOOR_HEIGHT,guardEdges:['right','back']});continue;}
      const p=assigned.get(slot)||descriptor(level===0?'Family room':slot.side==='left'?'Upper lounge':'Flexible room',level===0?'entertainment':'living');
      const room=add(p.name,p.type,slot.x,slot.y,slot.width,slot.depth,p.zone,{includesKitchen:p.type==='living'&&p.name==='Living / kitchen'});
      if(p.main)main=room;
    }
    let bathsLeft=sharedBaths[level];
    if(suite){
      const x=rightX+rightWidth,d=bayDepth/2;
      if(level===storeys-1){
        add(has('Main en-suite')?'Main en-suite':'Walk-in wardrobe',has('Main en-suite')?'bathroom':'dressing',x,0,2.8*scale,d,'private',{privateTo:main.id});
        add(has('Main en-suite')&&has('Walk-in wardrobe')?'Walk-in wardrobe':'Suite linen',has('Main en-suite')&&has('Walk-in wardrobe')?'dressing':'utility',x,d,2.8*scale,d,'private',{privateTo:main.id});
      }else{
        if(bathsLeft>0){add(`Bathroom ${++bathroomNumber}`,'bathroom',x,0,2.8*scale,d,'service');bathsLeft--;}
        else add('Linen','utility',x,0,2.8*scale,d,'service');
        add('Laundry / storage','utility',x,d,2.8*scale,d,'service');
      }
    }
    // On the suite level its column is private, so all shared bathrooms use the core.
    const tail=floorLength-6.2*scale,cells=Math.max(bathsLeft,Math.floor(tail/(2.6*scale))),cellDepth=tail/cells;
    for(let i=0;i<cells;i++){
      if(bathsLeft>0){add(`Bathroom ${++bathroomNumber}`,'bathroom',coreRoomX,6.2*scale+i*cellDepth,coreRoomWidth,cellDepth,'service');bathsLeft--;}
      else add(i===0?'Service riser / store':'Linen / store','utility',coreRoomX,6.2*scale+i*cellDepth,coreRoomWidth,cellDepth,'service');
    }
    const opening={x:round(stair.x),y:round(stair.y+1.2*scale),width:stair.width,depth:round(stair.depth-1.2*scale)};
    const openingArea=level>0?opening.width*opening.depth:0;
    if(level>0)stair.area=+(stair.area-openingArea).toFixed(2);
    const geometry=connectRooms({rooms,externalEntrance:level===0},hall.id);
    for(const terrace of terraces){
      const gallery=rooms.find(r=>r.type==='hall'&&Math.abs(r.x-(rightX-hallWidth))<.001);
      geometry.doors.push({axis:'y',x:terrace.x,y:round(terrace.y+.3),length:.9,terrace:true,hinge:'start',swing:-1,swingInto:gallery.id,
        connects:[gallery.id,terrace.id]});
    }
    const floor={id,level,name,elevation:level*FLOOR_HEIGHT,rooms,...geometry,width,length:floorLength,wall:.18,terraces,opening:level>0?opening:null,
      area:+(rooms.reduce((sum,r)=>sum+r.width*r.depth,0)-openingArea).toFixed(2)};
    for(const item of [...floor.walls,...floor.windows,...floor.doors]){item.floorId=id;item.level=level;}
    floors.push(floor);
    if(level>0){const lower=floors[level-1].rooms.find(r=>r.type==='stairs');
      stairs.push({id:`stair-${level-1}-${level}`,fromFloorId:lower.floorId,toFloorId:id,fromRoomId:lower.id,toRoomId:stair.id,
        x:stair.x,y:stair.y,width:stair.width,depth:stair.depth,opening,steps:18,riser:FLOOR_HEIGHT/18,tread:.3*scale,
        flightWidth:1.1*scale,landingDepth:1.2*scale,rise:FLOOR_HEIGHT,elevation:(level-1)*FLOOR_HEIGHT});}
  }
  const roofPlans=floors.map((f,i)=>({rooms:uncoveredRooms(f.rooms,[...(floors[i+1]?.rooms||[]),...(floors[i+1]?.terraces||[])]),
    width,length:f.length,elevation:f.elevation,style:answers.style,roofForm:answers.roofForm||'Automatic',id:f.id}));
  return {storeys,floors,stairs,roofPlans,width,length,wall:.18,rooms:floors.flatMap(f=>f.rooms),walls:floors.flatMap(f=>f.walls),windows:floors.flatMap(f=>f.windows),
    doors:[...floors.flatMap(f=>f.doors),...stairs.map(s=>({vertical:true,connects:[s.fromRoomId,s.toRoomId],stairId:s.id}))],
    terraces:floors.flatMap(f=>f.terraces),totalFloorArea:+floors.reduce((sum,f)=>sum+f.area,0).toFixed(2),
    footprintArea:+floors[0].rooms.reduce((sum,r)=>sum+r.width*r.depth,0).toFixed(2),
    notes:['Multi-storey layouts are authored adaptations, not multi-storey reconstructions of the source scan.',
      'Stair flights, aligned service zones and stacked wing bays are concept assumptions. No lift, structural member sizing, fire strategy or approval checks are generated.',
      'Unassigned upper bays become flexible family spaces. Choose fewer storeys to reduce unused accommodation.']};
}

function uncoveredRooms(rooms,cover) {
  return rooms.flatMap(room=>{
    let pieces=[room];
    for(const other of cover)pieces=pieces.flatMap(r=>{
      const x=Math.max(r.x,other.x),y=Math.max(r.y,other.y),endX=Math.min(r.x+r.width,other.x+other.width),endY=Math.min(r.y+r.depth,other.y+other.depth);
      if(endX-x<1e-5||endY-y<1e-5)return [r];
      return [[r.x,r.y,x-r.x,r.depth],[endX,r.y,r.x+r.width-endX,r.depth],[x,r.y,endX-x,y-r.y],[x,endY,endX-x,r.y+r.depth-endY]]
        .filter(([, ,w,d])=>w>1e-5&&d>1e-5).map(([x,y,width,depth])=>({...r,x,y,width,depth}));
    });
    return pieces.map((r,i)=>({...r,id:`${room.id}-roof-${i}`}));
  });
}

export function selectFloor(house,floorId) {
  if(!house.floors)return house;
  const floor=house.floors.find(f=>f.id===floorId)||house.floors[0];
  return {...house,...floor,floors:undefined,stairs:undefined,roofPlans:undefined,roofPlan:house.roofPlans?.[floor.level],storeys:1,
    upperCover:[...(house.floors[floor.level+1]?.rooms||[]),...(house.floors[floor.level+1]?.terraces||[])],coveredWallHeight:FLOOR_HEIGHT-.2,
    footprintArea:floor.area,totalFloorArea:floor.area,floorName:floor.name,buildingStoreys:house.storeys};
}
