/** Shared indicative furniture footprints for the SVG plan and Three.js model. */
export function placeFurniture(room) {
  const {x,y,width:w,depth:d,type}=room;
  const items=[];
  const add=(kind,dx,dy,width,depth,height=.75,color='#eee8dc')=>items.push({kind,x:x+dx,y:y+dy,width,depth,height,color});
  if (type==='bedroom') {
    add('bed',.3,.95,1.5,2,.5,'#f9f5e9');
    add('wardrobe',w-.65,.85,.5,Math.min(1.5,d-1.2),1.9,'#bca88d');
  } else if (type==='bathroom') {
    add('bath',.15,d-.85,Math.min(1.5,w*.55),.65,.5,'#ffffff');
    add('vanity',w-.7,.2,.55,.55,.8,'#ffffff');
    add('toilet',.2,.25,.45,.65,.45,'#ffffff');
  } else if (type==='office') {
    add('desk',.3,.85,Math.min(1.6,w-.6),.65,.75,'#8f694b');
    add('chair',.85,1.65,.5,.5,.45,'#b4b9aa');
  } else if (type==='garage') {
    for (const dx of [.5,3]) add('car',dx,.7,1.8,4.2,1.1,'#8d9b9d');
  } else if (type==='utility'||type==='dressing') {
    add(type==='dressing'?'wardrobe':'counter',.2,d-.75,w-.4,.55,type==='dressing'?2:.9,'#bca88d');
  } else if (type==='dining') {
    const tw=Math.min(2.4,w-.8);
    add('dining-table',(w-tw)/2,(d-1.1)/2,tw,1.1,.75,'#8f694b');
  } else if (type==='entertainment') {
    add('sofa',.3,1,Math.min(2.8,w-.6),.8,.75,'#9caa8b');
    add('media-screen',.4,d-.25,Math.min(2.4,w-.8),.1,1.3,'#303b35');
  } else if (type==='living') {
    add('sofa',.3,1.1,2.3,.8,.75,'#9caa8b');
    add('coffee-table',.7,2.4,1.2,.55,.4,'#8f694b');
    add('dining-table',w-1.4,w>=4.5?1.1:2.4,1,.65,.75,'#8f694b');
  }
  if (type==='kitchen'||room.includesKitchen) {
    add('kitchen-counter',w-2.6,d-.65,2.4,.5,.9,'#c3b59f');
    if (w>=4.5) add('kitchen-return',w-.7,d-1.8,.5,1.15,.9,'#c3b59f');
    if (type==='kitchen') add('kitchen-island',.4,1.1,1.5,.65,.9,'#c3b59f');
  }
  return items;
}
