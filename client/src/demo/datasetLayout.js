import templates from './floor-plan-templates.json';
import { connectRooms } from './templateGeometry';
import { buildSourceLayout } from './sourceLayouts';
import { resolveRoofForm } from './architecture';
import { buildMultiStoreyLayout, FLOOR_HEIGHT, MULTI_STOREY_ALLOWANCES } from './multiStorey';

export const FLOOR_PLAN_TEMPLATES = templates;
function buildCandidate(answers,template) {
  const features=Array.isArray(answers.homeFeatures)?answers.homeFeatures:[];
  const has=feature=>features.includes(feature),ensuite=has('Main en-suite'),sharedBaths=Number(answers.bathrooms)-Number(ensuite);
  const storeys=Number(answers.storeys||1);
  if(![1,2,3].includes(storeys))throw new Error('Choose one, two or three storeys.');
  const layout=storeys>1?buildMultiStoreyLayout(answers,template):buildSourceLayout(answers,template);
  const roofForm=answers.roofForm||'Automatic';
  const roofDesign=resolveRoofForm({style:answers.style,roofForm});
  const {rooms,width,length,wall}=layout;
  const geometry=storeys>1?{walls:layout.walls,windows:layout.windows,doors:layout.doors}:connectRooms(layout,layout.entryId),swap=['East','West'].includes(answers.access);
  const plotFrontage=Number(swap?answers.length:answers.width),plotDepth=Number(swap?answers.width:answers.length);
  const footprintArea=storeys>1?layout.footprintArea:+rooms.reduce((sum,r)=>sum+r.area,0).toFixed(2),rate={Basic:9500,Standard:12500,Premium:17000}[answers.finish]||9500;
  const totalFloorArea=layout.totalFloorArea||footprintArea;
  const upperFloorArea=storeys>1?+layout.floors.slice(1).reduce((sum,f)=>sum+f.area,0).toFixed(2):0;
  const additionalStoreyAllowance={upperFloorArea,stairCount:storeys-1,...MULTI_STOREY_ALLOWANCES,
    total:Math.round(upperFloorArea*MULTI_STOREY_ALLOWANCES.upperStructurePerM2+(storeys-1)*MULTI_STOREY_ALLOWANCES.stairPerConnection)};
  const total=Math.round(totalFloorArea*rate)+additionalStoreyAllowance.total;
  const siteParts=[...rooms,...layout.terraces];
  const siteWidth=Math.max(...siteParts.map(r=>r.x+r.width))-Math.min(...siteParts.map(r=>r.x));
  const siteDepth=Math.max(...siteParts.map(r=>r.y+r.depth))-Math.min(...siteParts.map(r=>r.y));
  const fitsPlot=siteWidth+2<=plotFrontage&&siteDepth+2<=plotDepth,withinBudget=total<=Number(answers.budget),conflicts=[],notes=[...(layout.notes||[])];
  if (!fitsPlot) conflicts.push(`This ${template.name.toLowerCase()} arrangement needs ${(siteWidth+2).toFixed(1)} m frontage and ${(siteDepth+2).toFixed(1)} m depth including terraces and demo boundary allowances.`);
  if (!withinBudget) conflicts.push(`The demo estimate is R${Math.round(total-answers.budget).toLocaleString('en-ZA')} above your budget. Requested rooms and features have been retained.`);
  if (ensuite&&sharedBaths===0) notes.push('Your only bathroom is the main en-suite. Increase the bathroom count if you need a shared bathroom.');
  const unlit=rooms.filter((r)=>['bedroom','bathroom','office'].includes(r.type)&&!geometry.windows.some((w)=>w.roomId===r.id));
  if (unlit.length) notes.push(`${unlit.map((r)=>r.name).join(', ')} need a daylight/ventilation review.`);
  return {schemaVersion:6,generatorVersion:'source-plans-v6-multi-storey',packing:storeys>1?'authored-multi-storey':'source-core-with-additions',terraces:layout.terraces,
    storeys,floors:layout.floors,stairs:layout.stairs,floorHeight:FLOOR_HEIGHT,totalFloorArea,additionalStoreyAllowance,
    roofBaseElevation:(storeys-1)*FLOOR_HEIGHT,roofPlans:layout.roofPlans,
    roofForm,roofDesign,siteWidth,siteDepth,
    layoutDescription:storeys>1?`${storeys} levels with a shared stair core, stacked service zones and aligned room wings. Social rooms are downstairs; the main bedroom is on the top floor.`:template.description,
    width,length,wall,rooms,...geometry,footprintArea,finish:answers.finish,
    circulationArea:+rooms.filter((r)=>r.type==='hall').reduce((n,r)=>n+r.area,0).toFixed(2),plotFrontage,plotDepth,rate,total,conflicts,notes,fitsPlot,withinBudget,style:answers.style,
    entranceEdge:answers.access==='Unknown'?'Unspecified':answers.access,spaceLevel:answers.spaceLevel||'Balanced',features,
    template:{...template,license:'CC BY 4.0',sourceUrl:'https://universe.roboflow.com/umair-ab9ex/floor-plans-500-xqdyk/dataset/1',
      adaptation:storeys>1?'Authored multi-storey adaptation of this spatial family. The source scan does not establish upper floors, stairs, structure or dimensions.':
        'Source room relationships and footprint setbacks are hand-traced. Requested extra rooms form marked additions. Dimensions and roof design are project assumptions; the scan supplies no verified scale or roof.'}};

}

export function createHouseConcept(answers) {
  const preference=answers.layoutPreference||'Best fit',features=answers.homeFeatures||[];
  const candidates=templates.map((template)=>buildCandidate(answers,template));
  const preferred=preference==='Best fit'?null:templates.find((t)=>t.name===preference)?.id;
  const score=(h)=>{
    let value=(h.fitsPlot?10000:0)+(h.withinBudget?5000:0);
    if (preferred===h.template.id) value+=100000;
    const {min,max}=h.template.program.bedroomCapacity;
    const bedrooms=Number(answers.bedrooms);
    value+=bedrooms>=min&&bedrooms<=max?100:-100*Math.min(Math.abs(bedrooms-min),Math.abs(bedrooms-max));
    if ((answers.spaceLevel==='Generous'||features.includes('Double garage'))&&h.template.recipe==='wide') value+=500;
    if (answers.spaceLevel==='Compact'&&h.template.recipe==='linear') value+=300;
    return value-h.footprintArea*.01;
  };
  candidates.sort((a,b)=>score(b)-score(a));
  const selected=candidates[0];
  selected.selectionReason=preferred?'Used your selected layout family; plot and budget conflicts remain visible.':
    'Compared three dataset-derived layout families against your plot, budget, rooms and space preference.';
  selected.alternatives=candidates.slice(1).map((h)=>({templateId:h.template.id,name:h.template.name,area:h.totalFloorArea,footprintArea:h.footprintArea,total:h.total,fitsPlot:h.fitsPlot,withinBudget:h.withinBudget}));
  return selected;
}
