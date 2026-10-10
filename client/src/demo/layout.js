/** Small, explicit layout pattern for the frontend prototype. Units: metres. */
export function createHouseConcept(answers) {
  const wall = .2;
  const wing = 3.6;
  const hall = 1.2;
  const width = wall * 2 + wing * 2 + hall;
  const publicDepth = 4.4;
  const rooms = [];
  const doors = [];
  const windows = [];
  const left = wall;
  const corridorX = wall + wing;
  const right = corridorX + hall;
  const add = (name, type, x, y, w, d) => {
    const room = { id: `room-${rooms.length + 1}`, name, type, x, y, width: w, depth: d, area: +(w * d).toFixed(2) };
    rooms.push(room); return room;
  };
  const publicY = wall;
  if (answers.kitchen === 'Separate') {
    add('Living / dining', 'living', left, publicY, 5.2, publicDepth);
    add('Kitchen', 'kitchen', left + 5.2, publicY, 3.2, publicDepth);
    doors.push({ x: left + 5.2, y: 1.25, length: .9, axis: 'y', side: 'right', connects: ['room-1', 'room-2'] });
  } else add('Living / dining / kitchen', 'living', left, publicY, wing * 2 + hall, publicDepth);
  const privateRooms = Array.from({ length: Number(answers.bedrooms) }, (_, i) => ({ name: i === 0 ? 'Main bedroom' : `Bedroom ${i + 1}`, type: 'bedroom', depth: i === 0 ? 4 : 3.4 }));
  if (answers.workFromHome === 'Yes' && answers.office === 'Dedicated quiet office') privateRooms.push({ name: 'Office', type: 'office', depth: 3 });
  for (let i = 0; i < Number(answers.bathrooms); i++) privateRooms.push({ name: `Bathroom ${i + 1}`, type: 'bathroom', depth: 2.4 });
  let y = wall + publicDepth + wall;
  const corridorStart = y;
  for (let i = 0; i < privateRooms.length; i += 2) {
    const pair = [privateRooms[i], privateRooms[i + 1] || { name: 'Laundry / storage', type: 'utility', depth: 2.4 }];
    const depth = Math.max(...pair.map((r) => r.depth));
    pair.forEach((r, side) => {
      const x = side === 0 ? left : right;
      const room = add(r.name, r.type, x, y, wing, depth);
      doors.push({ x: side === 0 ? corridorX : right, y: y + .45, length: .9, axis: 'y', side: side === 0 ? 'left' : 'right', connects: ['hall', room.id] });
      windows.push({ x: side === 0 ? left : width - wall, y: y + depth / 2 - .65, length: r.type === 'bathroom' ? .8 : 1.3, axis: 'y', roomId: room.id });
    });
    y += depth + wall;
  }
  const length = y;
  add('Hallway', 'hall', corridorX, corridorStart, hall, length - wall - corridorStart);
  doors.push({ x: corridorX, y: corridorStart, length: hall, axis: 'x', opening: true, connects: ['room-1', 'hall'] });
  doors.push({ x: corridorX, y: corridorStart - wall, length: hall, axis: 'x', opening: true, connects: ['room-1', 'hall'] });
  doors.push({ x: corridorX + .1, y: wall, length: 1, axis: 'x', entrance: true, connects: ['outside', 'room-1'] });
  windows.push({ x: 1, y: wall, length: 1.8, axis: 'x', roomId: 'room-1' }, { x: width - 2.6, y: wall, length: 1.6, axis: 'x', roomId: answers.kitchen === 'Separate' ? 'room-2' : 'room-1' });
  const swap = ['East', 'West'].includes(answers.access);
  const plotFrontage = Number(swap ? answers.length : answers.width);
  const plotDepth = Number(swap ? answers.width : answers.length);
  const footprintArea = +(width * length).toFixed(2);
  const circulationArea = rooms.find((r) => r.type === 'hall').area;
  const rate = { Basic: 9500, Standard: 12500, Premium: 17000 }[answers.finish] || 9500;
  const total = Math.round(footprintArea * rate);
  const conflicts = [];
  if (width + 2 > plotFrontage || length + 2 > plotDepth) conflicts.push(`This arrangement needs at least ${(width + 2).toFixed(1)} m frontage and ${(length + 2).toFixed(1)} m depth with the demo 1 m boundary allowance. Reduce rooms or use a larger plot.`);
  if (total > Number(answers.budget)) conflicts.push(`The demo estimate exceeds your budget by R${Math.round(total - answers.budget).toLocaleString('en-ZA')}. Try fewer optional spaces or review the budget.`);
  return { schemaVersion: 2, width, length, wall, rooms, doors, windows, footprintArea, circulationArea, plotFrontage, plotDepth, rate, total, conflicts, fitsPlot: width + 2 <= plotFrontage && length + 2 <= plotDepth, withinBudget: total <= Number(answers.budget), style: answers.style, entranceEdge: answers.access === 'Unknown' ? 'Unspecified' : answers.access };
}
