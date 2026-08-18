// Zomerberging yard layout: 48 fixed boat locations around a paved storage area.
//
// Measurements from the harbor sketch (all slots are 10m deep):
//   Top edge, right to left:    1-7 @ 3m, 8-14 @ 2.5m, 3m grass, 48-40 @ 2.5m
//   Bottom edge, right to left: 15-24 @ 3m, 25-27 @ 2.5m, 3m grass, 28-38 @ 2.5m
//   Left edge, vertically centered: 39 @ 2.5m
// Both rows are aligned to the right edge; the bottom row is 4m wider,
// which leaves an open paved corner at the top left (rounded in the sketch).

import { BoatData, YardLayout, YardSlot } from '../types/dock';

export const YARD_SLOT_DEPTH = 10; // meters

const YARD_WIDTH = 68; // bottom row: 10*3 + 3*2.5 + 3 + 11*2.5
const YARD_HEIGHT = 36; // two 10m slot rows + 16m open middle

export function createZomerbergingYard(): YardLayout {
  const slots: YardSlot[] = [];
  const W = YARD_WIDTH;
  const D = YARD_SLOT_DEPTH;

  // Top edge, walking right to left from the right yard corner
  let xRight = W;
  for (let n = 1; n <= 7; n++) {
    slots.push({ number: n, edge: 'top', x: xRight - 3, y: 0, width: 3, depth: D });
    xRight -= 3;
  }
  for (let n = 8; n <= 14; n++) {
    slots.push({ number: n, edge: 'top', x: xRight - 2.5, y: 0, width: 2.5, depth: D });
    xRight -= 2.5;
  }
  const topGrass = { x: xRight - 3, y: 0, width: 3, height: D };
  xRight -= 3;
  for (let n = 48; n >= 40; n--) {
    slots.push({ number: n, edge: 'top', x: xRight - 2.5, y: 0, width: 2.5, depth: D });
    xRight -= 2.5;
  }

  // Bottom edge, walking right to left from the right yard corner
  xRight = W;
  for (let n = 15; n <= 24; n++) {
    slots.push({ number: n, edge: 'bottom', x: xRight - 3, y: YARD_HEIGHT - D, width: 3, depth: D });
    xRight -= 3;
  }
  for (let n = 25; n <= 27; n++) {
    slots.push({ number: n, edge: 'bottom', x: xRight - 2.5, y: YARD_HEIGHT - D, width: 2.5, depth: D });
    xRight -= 2.5;
  }
  const bottomGrass = { x: xRight - 3, y: YARD_HEIGHT - D, width: 3, height: D };
  xRight -= 3;
  for (let n = 28; n <= 38; n++) {
    slots.push({ number: n, edge: 'bottom', x: xRight - 2.5, y: YARD_HEIGHT - D, width: 2.5, depth: D });
    xRight -= 2.5;
  }

  // Slot 39 on the left edge, vertically centered, pointing into the yard
  slots.push({
    number: 39,
    edge: 'left',
    x: 0,
    y: YARD_HEIGHT / 2 - 1.25,
    width: 2.5,
    depth: D,
  });

  return {
    width: W,
    height: YARD_HEIGHT,
    slots,
    grassStrips: [topGrass, bottomGrass],
  };
}

export interface YardTransform {
  scale: number; // pixels per meter
  offsetX: number;
  offsetY: number;
}

export function calculateYardTransform(
  yard: YardLayout,
  canvasWidth: number,
  canvasHeight: number
): YardTransform {
  const scale = Math.min(
    (canvasWidth * 0.92) / yard.width,
    (canvasHeight * 0.88) / yard.height
  );
  return {
    scale,
    offsetX: (canvasWidth - yard.width * scale) / 2,
    offsetY: (canvasHeight - yard.height * scale) / 2,
  };
}

export interface YardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getSlotByNumber(yard: YardLayout, slotNumber: number): YardSlot | undefined {
  return yard.slots.find(s => s.number === slotNumber);
}

export function isBoatCompatibleWithSlot(boat: BoatData, slot: YardSlot): boolean {
  const epsilon = 1e-9;
  return boat.width <= slot.width + epsilon && boat.length <= slot.depth + epsilon;
}

export const MOORING_BOX_DEPTH = 2; // meters, matches the 2m mooring boxes on the other quays

// The dashed mooring box that marks a free berth. As on the other quays this
// box is both the marker and the click target for placing a boat.
export function getBerthMooringBoxRect(slot: YardSlot): YardRect {
  const rect = getSlotRect(slot);
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const alongEdge = slot.width - 0.4;
  const width = slot.edge === 'left' ? MOORING_BOX_DEPTH : alongEdge;
  const height = slot.edge === 'left' ? alongEdge : MOORING_BOX_DEPTH;
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

// Axis-aligned slot rectangle in yard meters
export function getSlotRect(slot: YardSlot): YardRect {
  if (slot.edge === 'left') {
    return { x: slot.x, y: slot.y, width: slot.depth, height: slot.width };
  }
  return { x: slot.x, y: slot.y, width: slot.width, height: slot.depth };
}

// Axis-aligned bounding rect of a boat parked in a slot (centered in the slot)
export function getPlacedBoatRect(boat: BoatData, slot: YardSlot): YardRect {
  const rect = getSlotRect(slot);
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  if (slot.edge === 'left') {
    // Boat length runs horizontally
    return {
      x: centerX - boat.length / 2,
      y: centerY - boat.width / 2,
      width: boat.length,
      height: boat.width,
    };
  }
  // Boat length runs vertically
  return {
    x: centerX - boat.width / 2,
    y: centerY - boat.length / 2,
    width: boat.width,
    height: boat.length,
  };
}

// Lay out boats that have no location yet in the open middle area,
// in centered rows so the user can pick them up and place them.
export function getUnplacedBoatRects(
  yard: YardLayout,
  unplacedBoats: BoatData[]
): Map<string, YardRect> {
  const rects = new Map<string, YardRect>();
  if (unplacedBoats.length === 0) return rects;

  const gap = 1;
  const rowPadding = 1.5;
  const maxRowWidth = yard.width * 0.6;
  const centerX = yard.width / 2 + 4; // nudge right, away from slot 39
  const centerY = yard.height / 2;

  // Group boats into rows that fit within maxRowWidth
  const rows: BoatData[][] = [];
  let currentRow: BoatData[] = [];
  let currentWidth = 0;
  unplacedBoats.forEach(boat => {
    const needed = boat.length + (currentRow.length > 0 ? gap : 0);
    if (currentRow.length > 0 && currentWidth + needed > maxRowWidth) {
      rows.push(currentRow);
      currentRow = [];
      currentWidth = 0;
    }
    currentRow.push(boat);
    currentWidth += needed;
  });
  if (currentRow.length > 0) rows.push(currentRow);

  const rowHeights = rows.map(row => Math.max(...row.map(b => b.width)) + rowPadding);
  const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);

  let y = centerY - totalHeight / 2;
  rows.forEach((row, rowIndex) => {
    const rowWidth =
      row.reduce((sum, b) => sum + b.length, 0) + gap * (row.length - 1);
    let x = centerX - rowWidth / 2;
    const rowCenterY = y + rowHeights[rowIndex] / 2;
    row.forEach(boat => {
      rects.set(boat.id, {
        x,
        y: rowCenterY - boat.width / 2,
        width: boat.length,
        height: boat.width,
      });
      x += boat.length + gap;
    });
    y += rowHeights[rowIndex];
  });

  return rects;
}

export function isPointInRect(px: number, py: number, rect: YardRect): boolean {
  return (
    px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height
  );
}
