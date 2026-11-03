const round=n=>+n.toFixed(4);

/** Hand-traced room relationships from the three reviewed scans, facing the entrance.
 * Dimensions are design assumptions: these scans contain no dependable metric scale.
 * Additions are explicit wings; the source core is never repacked into a corridor.
 */
export function buildSourceLayout(answers,template) {
  const scale={Compact:.94,Balanced:1,Generous:1.15}[answers.spaceLevel]||1;
  const features=answers.homeFeatures||[],has=f=>features.includes(f);
  const rooms=[],terraces=[];
  let main,entry,hallX,hallWidth,coreEnd;
  let beds=Number(answers.bedrooms),baths=Number(answers.bathrooms)-Number(has('Main en-suite'));
  const add=(name,type,x,y,width,depth,zone='public',extra={})=>{
    const r={id:`room-${rooms.length+1}`,name,type,x,y,width,depth,zone,...extra};rooms.push(r);return r;
  };
  const bed=(x,y,w,d)=>{ const r=add(main?`Bedroom ${Number(answers.bedrooms)-beds+1}`:'Main bedroom','bedroom',x,y,w,d,'private');if(!main)main=r;beds--;return r; };
  const bath=(x,y,w,d)=>{
    if(baths>0){baths--;return add(`Bathroom ${Number(answers.bathrooms)-Number(has('Main en-suite'))-baths}`,'bathroom',x,y,w,d,'service');}
    return add('Storage','utility',x,y,w,d,'service');
  };
  const living=(x,y,w,d)=>add(answers.kitchen==='Separate'?'Living room':'Living / dining','living',x,y,w,d);
  if(template.recipe==='wide') {
    // 979: service/garage left, shared living at centre, three bedroom positions right.
    const lw=has('Double garage')?5.8:3.6,sx=lw,cx=sx+3.2,rx=cx+5.2+1.4;
    add('Laundry','utility',0,0,lw,2.8,'service');
    add(has('Double garage')?'Double garage':'Family studio',has('Double garage')?'garage':'entertainment',0,2.8,lw,6,'garage');
    bath(sx,0,3.2,2.8);add('Store / services','utility',sx,2.8,3.2,2.8,'service');
    add('Library / study','utility',sx,5.6,3.2,4.2,'service');
    add('Kitchen / dining','kitchen',cx,0,5.2,5.6,'public',{openKitchen:answers.kitchen!=='Separate'});
    living(cx,5.6,5.2,4.2);
    entry=add('Entrance gallery','hall',cx+5.2,0,1.4,9.8);
    add('Family foyer','hall',rx,0,4.2,4.2);
    main=bed(rx+4.2,0,4.2,4.2);
    add('Bedroom lobby','hall',rx,4.2,8.4,1.4);
    if(beds>0)bed(rx,5.6,4.2,4.2);
    if(beds>0)bed(rx+4.2,5.6,4.2,4.2);
    else terraces.push({name:'Private terrace',x:rx+4.2,y:5.6,width:4.2,depth:4.2});
    hallX=cx+5.2;hallWidth=1.4;coreEnd=9.8;
    terraces.push({name:'Arrival terrace',x:cx,y:-1.8,width:6.6,depth:1.8});
  } else if(template.recipe==='split') {
    // 1115: diagonal bedrooms, separate kitchen, central entry and stepped boundary.
    main=bed(0,0,4.4,4.4);bath(4.4,0,2.6,2.8);
    living(7,0,5.6,5.6);
    add('Kitchen / dining','kitchen',0,4.4,4.4,4,'public',{openKitchen:answers.kitchen!=='Separate'});
    entry=add('Entrance foyer','hall',4.4,2.8,2.6,5.6);
    add('Bedroom lobby','hall',7,5.6,5.6,1.4);
    if(beds>0)bed(7,7,5.6,4.4);
    else add('Family room','entertainment',7,7,5.6,4.4);
    entry=add('Entrance vestibule','hall',4.4,8.4,2.6,3,'public');
    hallX=4.4;hallWidth=2.6;coreEnd=11.4;
    terraces.push({name:'Living terrace',x:12.6,y:0,width:2.2,depth:5.6});
  } else {
    // 649: bedroom/service band beside living, kitchen and entrance; rear balcony retained.
    bath(0,0,3.6,2.8);add('Laundry / storage','utility',0,2.8,3.6,2.8,'service');
    main=bed(0,5.6,3.6,3.8);
    entry=add('Entrance hall','hall',3.6,0,1.4,3.4);
    add('Kitchen','kitchen',5,0,3.8,3.4,'public',{openKitchen:answers.kitchen!=='Separate'});
    living(3.6,3.4,5.2,6);
    hallX=3.6;hallWidth=1.4;coreEnd=9.4;
    terraces.push({name:'Living terrace',x:5,y:9.4,width:3.8,depth:2});
  }
  // A private suite projects from the outer wall of the original main bedroom.
  if(has('Main en-suite')||has('Walk-in wardrobe')) {
    const right=template.recipe==='wide',x=right?main.x+main.width:main.x-2.8;
    const both=has('Main en-suite')&&has('Walk-in wardrobe'),d=main.depth/(both?2:1);
    if(has('Main en-suite'))add('Main en-suite','bathroom',x,main.y,2.8,d,'private',{privateTo:main.id,addition:true});
    if(has('Walk-in wardrobe'))add('Walk-in wardrobe','dressing',x,main.y+(both?d:0),2.8,d,'private',{privateTo:main.id,addition:true});
  }
  // Extend the source's circulation only as far as actual extra accommodation needs.
  const extras=[];
  while(beds>0){extras.push({name:`Bedroom ${Number(answers.bedrooms)-beds+1}`,type:'bedroom',w:4.2,d:3.8,zone:'private'});beds--;}
  while(baths>0){extras.push({name:`Bathroom ${Number(answers.bathrooms)-Number(has('Main en-suite'))-baths+1}`,type:'bathroom',w:3.2,d:2.8,zone:'service'});baths--;}
  if(answers.workFromHome==='Yes'&&answers.office==='Dedicated quiet office')extras.push({name:'Office',type:'office',w:4.2,d:3.4,zone:'service'});
  for(const [feature,name,type,w,d] of [['Separate dining room','Dining room','dining',4.8,4],['Entertainment room','Entertainment room','entertainment',5.2,4.6],['Double garage','Double garage','garage',5.8,6]])
    if(has(feature)&&!(feature==='Double garage'&&template.recipe==='wide'))extras.push({name,type,w,d,zone:type==='garage'?'garage':'public'});
  if(extras.length){
    // Alternate additions along the existing gallery; leave genuine courtyards unfilled.
    let left=coreEnd,right=coreEnd;
    for(const e of extras){
      const onLeft=left<=right,y=onLeft?left:right,x=onLeft?hallX-e.w:hallX+hallWidth;
      add(e.name,e.type,x,y,e.w,e.d,e.zone,{addition:true});
      if(onLeft)left+=e.d;else right+=e.d;
    }
    add('Extension gallery','hall',hallX,coreEnd,hallWidth,Math.max(left,right)-coreEnd,'public',{addition:true});
    // The apartment balcony is relocated to the end of its added bedroom wing.
    if(template.recipe==='linear')terraces[0].y=Math.max(left,right);
  }
  const minX=Math.min(0,...rooms.map(r=>r.x)),minY=Math.min(0,...rooms.map(r=>r.y));
  for(const r of [...rooms,...terraces]){
    r.x=round((r.x-minX)*scale);r.y=round((r.y-minY)*scale);r.width=round(r.width*scale);r.depth=round(r.depth*scale);
    if(r.id)r.area=+(r.width*r.depth).toFixed(2);
  }
  const width=round(Math.max(...rooms.map(r=>r.x+r.width))),length=round(Math.max(...rooms.map(r=>r.y+r.depth)));
  return {rooms,width,length,wall:.18,entryId:entry.id,terraces};
}
