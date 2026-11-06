const round = (n) => +n.toFixed(4);

/** Small authored room programme. These are design assumptions, not certified minima.
 * Required rooms and extras remain; no unused source-plan rooms are inserted.
 */
export function buildBudgetLayout(answers) {
  if (Number(answers.storeys || 1) !== 1) throw new Error('Budget-efficient layouts currently support one storey. Keep the source-inspired approach for multiple storeys.');
  const scale = { Compact: 1, Balanced: 1.08, Generous: 1.2 }[answers.spaceLevel] || 1;
  const features = answers.homeFeatures || [];
  const has = (name) => features.includes(name);
  const rooms = [];
  const add = (name, type, x, y, width, depth, extra = {}) => {
    const room = { id: `room-${rooms.length + 1}`, name, type, x, y, width, depth, zone: type === 'bedroom' ? 'private' : type === 'bathroom' ? 'service' : 'public', compact: true, ...extra };
    rooms.push(room); return room;
  };
  const bedroomWidth = 2.9, bedroomDepth = 3.1, hallWidth = 1.0, publicWidth = 2.9;
  const rightX = bedroomWidth + hallWidth;
  for (let i = 0; i < Number(answers.bedrooms); i++) add(i ? `Bedroom ${i + 1}` : 'Main bedroom', 'bedroom', 0, i * bedroomDepth, bedroomWidth, bedroomDepth);
  const main = rooms[0];
  if (has('Main en-suite')) add('Main en-suite', 'bathroom', -1.6, 0, 1.6, has('Walk-in wardrobe') ? 1.8 : 2.2, { privateTo: main.id });
  if (has('Walk-in wardrobe')) add('Walk-in wardrobe', 'dressing', -1.6, has('Main en-suite') ? 1.8 : 0, 1.6, has('Main en-suite') ? 1.3 : 2.2, { privateTo: main.id });
  let y = 0;
  add(answers.kitchen === 'Separate' ? 'Living room' : 'Living / dining', 'living', rightX, y, publicWidth, 3.6); y += 3.6;
  add('Kitchen', 'kitchen', rightX, y, publicWidth, 2.3, { openKitchen: answers.kitchen !== 'Separate' }); y += 2.3;
  for (let i = 0; i < Number(answers.bathrooms) - Number(has('Main en-suite')); i++) { add(`Bathroom ${i + 1}`, 'bathroom', rightX, y, publicWidth, 1.6); y += 1.6; }
  if (answers.workFromHome === 'Yes' && answers.office === 'Dedicated quiet office') { add('Office', 'office', rightX, y, publicWidth, 2.6); y += 2.6; }
  for (const [feature, name, type, width, depth] of [['Separate dining room', 'Dining room', 'dining', 2.9, 2.8], ['Entertainment room', 'Entertainment room', 'entertainment', 2.9, 3.6], ['Double garage', 'Double garage', 'garage', 5.8, 6]]) {
    if (has(feature)) { add(name, type, rightX, y, width, depth); y += depth; }
  }
  const entrance = add('Entrance gallery', 'hall', bedroomWidth, 0, hallWidth, Math.max(y, Number(answers.bedrooms) * bedroomDepth));
  const minX = Math.min(...rooms.map((room) => room.x));
  for (const room of rooms) {
    room.x = round((room.x - minX) * scale); room.y = round(room.y * scale);
    room.width = round(room.width * scale); room.depth = round(room.depth * scale); room.area = +(room.width * room.depth).toFixed(2);
  }
  return { rooms, width: round(Math.max(...rooms.map((room) => room.x + room.width))), length: round(Math.max(...rooms.map((room) => room.y + room.depth))), wall: .18, entryId: entrance.id, terraces: [],
    notes: ['Budget-efficient authored layout: smaller rooms and shorter circulation replace the source core. Dimensions, furniture clearances and accessibility require professional review. No requested room or selected additional space has been removed.'] };
}
