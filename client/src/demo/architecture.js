const EAVE_HEIGHT = 2.9;
const ROOF_OVERHANG = 0.3;
const ROOF_PITCH = Math.tan(Math.PI / 6);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function resolveRoofForm(house) {
  if (house.roofForm === 'Intersecting gables' || house.roofForm === 'Multi-hip') return house.roofForm;
  return house.style === 'Traditional' ? 'Multi-hip' : 'Intersecting gables';
}

function partitionFootprint(rooms) {
  const socialRooms = rooms.filter((room) => ['living', 'kitchen', 'dining', 'entertainment'].includes(room.type));
  const privateRooms = rooms.filter((room) => ['bedroom', 'dressing'].includes(room.type));
  const bounds = (items) => ({
    x0: Math.min(...items.map((room) => room.x)),
    x1: Math.max(...items.map((room) => room.x + room.width)),
    y0: Math.min(...items.map((room) => room.y)),
    y1: Math.max(...items.map((room) => room.y + room.depth)),
  });
  let functionalSplit = null;
  if (socialRooms.length && privateRooms.length) {
    const social = bounds(socialRooms), privateWing = bounds(privateRooms);
    const candidates = [
      { axis: 'x', before: 'social', coordinate: (social.x1 + privateWing.x0) / 2, separated: social.x1 <= privateWing.x0, overlap: Math.min(social.y1, privateWing.y1) - Math.max(social.y0, privateWing.y0) },
      { axis: 'x', before: 'private', coordinate: (privateWing.x1 + social.x0) / 2, separated: privateWing.x1 <= social.x0, overlap: Math.min(social.y1, privateWing.y1) - Math.max(social.y0, privateWing.y0) },
      { axis: 'y', before: 'social', coordinate: (social.y1 + privateWing.y0) / 2, separated: social.y1 <= privateWing.y0, overlap: Math.min(social.x1, privateWing.x1) - Math.max(social.x0, privateWing.x0) },
      { axis: 'y', before: 'private', coordinate: (privateWing.y1 + social.y0) / 2, separated: privateWing.y1 <= social.y0, overlap: Math.min(social.x1, privateWing.x1) - Math.max(social.x0, privateWing.x0) },
    ].filter((candidate) => candidate.separated && candidate.overlap > .1);
    if (candidates.length) {
      const selected = candidates.sort((a, b) => b.overlap - a.overlap || a.coordinate - b.coordinate)[0];
      functionalSplit = { ...selected, after: selected.before === 'social' ? 'private' : 'social' };
    }
  }
  const xs = [...new Set([...rooms.flatMap((room) => [room.x, room.x + room.width]), ...(functionalSplit?.axis === 'x' ? [functionalSplit.coordinate] : [])])].sort((a, b) => a - b);
  const ys = [...new Set([...rooms.flatMap((room) => [room.y, room.y + room.depth]), ...(functionalSplit?.axis === 'y' ? [functionalSplit.coordinate] : [])])].sort((a, b) => a - b);
  const rows = ys.length - 1;
  const columns = xs.length - 1;
  const zones = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
    if (!functionalSplit) return 'main';
    const coordinate = functionalSplit.axis === 'x'
      ? (xs[column] + xs[column + 1]) / 2
      : (ys[row] + ys[row + 1]) / 2;
    return coordinate < functionalSplit.coordinate ? functionalSplit.before : functionalSplit.after;
  }));
  const available = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
    const x = (xs[column] + xs[column + 1]) / 2;
    const y = (ys[row] + ys[row + 1]) / 2;
    return rooms.some((room) => x > room.x && x < room.x + room.width && y > room.y && y < room.y + room.depth);
  }));
  const sections = [];

  while (available.some((row) => row.some(Boolean))) {
    let best = null;
    for (let top = 0; top < rows; top++) {
      const validColumns = Array(columns).fill(true);
      for (let bottom = top; bottom < rows; bottom++) {
        let runStart = -1;
        for (let column = 0; column <= columns; column++) {
          validColumns[column] = column < columns && validColumns[column] && available[bottom][column]
            && zones[bottom][column] === zones[top][column];
          const sameZoneAsRun = runStart < 0 || column === columns || zones[bottom][column] === zones[bottom][runStart];
          if (validColumns[column] && sameZoneAsRun && runStart < 0) runStart = column;
          if ((!validColumns[column] || !sameZoneAsRun || column === columns) && runStart >= 0) {
            const x0 = xs[runStart];
            const x1 = xs[column];
            const y0 = ys[top];
            const y1 = ys[bottom + 1];
            const area = (x1 - x0) * (y1 - y0);
            if (!best || area > best.area) best = { top, bottom, left: runStart, right: column - 1, x0, x1, y0, y1, area, zone: zones[top][runStart] };
            runStart = validColumns[column] ? column : -1;
          }
        }
      }
    }
    if (!best) throw new Error('Could not partition the occupied house footprint into roof sections.');
    const roomIds = new Set();
    for (let row = best.top; row <= best.bottom; row++) {
      for (let column = best.left; column <= best.right; column++) {
        available[row][column] = false;
        const x = (xs[column] + xs[column + 1]) / 2;
        const y = (ys[row] + ys[row + 1]) / 2;
        const room = rooms.find((item) => x > item.x && x < item.x + item.width && y > item.y && y < item.y + item.depth);
        if (room) roomIds.add(room.id);
      }
    }
    sections.push({ ...best, roomIds: [...roomIds] });
  }
  return { sections, functionalSplit };
}

export function roofSections(house) {
  const form = resolveRoofForm(house);
  const partition = partitionFootprint(house.rooms);
  return partition.sections.map((section, index) => {
    const x0 = section.x0 - ROOF_OVERHANG;
    const x1 = section.x1 + ROOF_OVERHANG;
    const y0 = section.y0 - ROOF_OVERHANG;
    const y1 = section.y1 + ROOF_OVERHANG;
    const width = x1 - x0;
    const depth = y1 - y0;
    const ridgeAxis = section.zone === 'private'
      ? (partition.functionalSplit.axis === 'x' ? 'y' : 'x')
      : (width >= depth ? 'x' : 'y');
    const ridgeCoordinate = ridgeAxis === 'x' ? (y0 + y1) / 2 : (x0 + x1) / 2;
    const ridgeLength = Math.max(0, (ridgeAxis === 'x' ? width - depth : depth - width));
    const rise = Math.min(width, depth) * ROOF_PITCH / 2;
    return {
      id: `roof-section-${index + 1}`,
      form,
      zone: section.zone,
      x0, x1, y0, y1, width, depth,
      buildingBounds: { x0: section.x0, x1: section.x1, y0: section.y0, y1: section.y1 },
      eaveHeight: EAVE_HEIGHT,
      ridgeHeight: EAVE_HEIGHT + rise,
      ridgeAxis,
      ridgeCoordinate,
      ridgeStart: ridgeAxis === 'x' ? x0 + (width - ridgeLength) / 2 : y0 + (depth - ridgeLength) / 2,
      ridgeEnd: ridgeAxis === 'x' ? x1 - (width - ridgeLength) / 2 : y1 - (depth - ridgeLength) / 2,
      roomIds: section.roomIds,
    };
  });
}

function sectionHeight(section, x, y) {
  if (section.form === 'Intersecting gables') {
    const span = section.ridgeAxis === 'x' ? section.depth : section.width;
    const offset = section.ridgeAxis === 'x' ? y - section.ridgeCoordinate : x - section.ridgeCoordinate;
    return section.eaveHeight + (section.ridgeHeight - section.eaveHeight) * clamp(1 - Math.abs(offset) / (span / 2), 0, 1);
  }
  const edgeDistance = Math.min(x - section.x0, section.x1 - x, y - section.y0, section.y1 - y);
  return section.eaveHeight + (section.ridgeHeight - section.eaveHeight)
    * clamp(edgeDistance / (Math.min(section.width, section.depth) / 2), 0, 1);
}

export function roofHeightAt(house, x, y) {
  const sections = roofSections(house).filter((section) => x >= section.x0 - .001 && x <= section.x1 + .001
    && y >= section.y0 - .001 && y <= section.y1 + .001);
  return sections.length ? Math.max(...sections.map((section) => sectionHeight(section, x, y))) : EAVE_HEIGHT;
}

export function roofHeight(house, _room, x, y) {
  return roofHeightAt(house, x, y ?? 0);
}

function point(x, y, z) {
  return [x, y, z];
}

export function roofPanels(house) {
  return roofSections(house).flatMap((section) => {
    const { x0, x1, y0, y1, ridgeAxis, ridgeCoordinate, ridgeStart, ridgeEnd, eaveHeight, ridgeHeight } = section;
    if (section.form === 'Intersecting gables') {
      if (ridgeAxis === 'x') return [
        { ...section, face: 'gable-front', points: [point(x0, y0, eaveHeight), point(x1, y0, eaveHeight), point(x1, ridgeCoordinate, ridgeHeight), point(x0, ridgeCoordinate, ridgeHeight)] },
        { ...section, face: 'gable-back', points: [point(x0, ridgeCoordinate, ridgeHeight), point(x1, ridgeCoordinate, ridgeHeight), point(x1, y1, eaveHeight), point(x0, y1, eaveHeight)] },
      ];
      return [
        { ...section, face: 'gable-left', points: [point(x0, y0, eaveHeight), point(ridgeCoordinate, y0, ridgeHeight), point(ridgeCoordinate, y1, ridgeHeight), point(x0, y1, eaveHeight)] },
        { ...section, face: 'gable-right', points: [point(ridgeCoordinate, y0, ridgeHeight), point(x1, y0, eaveHeight), point(x1, y1, eaveHeight), point(ridgeCoordinate, y1, ridgeHeight)] },
      ];
    }
    if (ridgeAxis === 'x') return [
      { ...section, face: 'hip-front', points: [point(x0, y0, eaveHeight), point(x1, y0, eaveHeight), point(ridgeEnd, ridgeCoordinate, ridgeHeight), point(ridgeStart, ridgeCoordinate, ridgeHeight)] },
      { ...section, face: 'hip-back', points: [point(ridgeStart, ridgeCoordinate, ridgeHeight), point(ridgeEnd, ridgeCoordinate, ridgeHeight), point(x1, y1, eaveHeight), point(x0, y1, eaveHeight)] },
      { ...section, face: 'hip-left', points: [point(x0, y0, eaveHeight), point(ridgeStart, ridgeCoordinate, ridgeHeight), point(x0, y1, eaveHeight)] },
      { ...section, face: 'hip-right', points: [point(x1, y0, eaveHeight), point(x1, y1, eaveHeight), point(ridgeEnd, ridgeCoordinate, ridgeHeight)] },
    ];
    return [
      { ...section, face: 'hip-front', points: [point(x0, y0, eaveHeight), point(ridgeCoordinate, ridgeStart, ridgeHeight), point(ridgeCoordinate, ridgeEnd, ridgeHeight), point(x0, y1, eaveHeight)] },
      { ...section, face: 'hip-back', points: [point(ridgeCoordinate, ridgeStart, ridgeHeight), point(x1, y0, eaveHeight), point(x1, y1, eaveHeight), point(ridgeCoordinate, ridgeEnd, ridgeHeight)] },
      { ...section, face: 'hip-left', points: [point(x0, y0, eaveHeight), point(x1, y0, eaveHeight), point(ridgeCoordinate, ridgeStart, ridgeHeight)] },
      { ...section, face: 'hip-right', points: [point(ridgeCoordinate, ridgeEnd, ridgeHeight), point(x1, y1, eaveHeight), point(x0, y1, eaveHeight)] },
    ];
  });
}

export function exteriorHeight(house, wall, x, y) {
  const px = x ?? wall.x + (wall.axis === 'x' ? wall.length / 2 : 0);
  const py = y ?? wall.y + (wall.axis === 'y' ? wall.length / 2 : 0);
  return roofHeightAt(house, px, py) - .12;
}
