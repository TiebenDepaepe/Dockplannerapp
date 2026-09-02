// Zomerberging yard layout: 48 fixed parking places around a paved storage area.
//
// Measurements from the harbor sketch (every place is 10m deep):
//   Top edge, right to left:    1-7 @ 3m, 8-14 @ 2.5m, 3m grass, 48-40 @ 2.5m
//   Bottom edge, right to left: 15-24 @ 3m, 25-27 @ 2.5m, 3m grass, 38-28 @ 2.5m
//   Left edge, vertically centered: 39 @ 2.5m
//
// The places are angled so the boats nose towards the centre of the yard:
// the two runs left of the grass gap lean one way and the two runs right of it
// lean the other, giving \\\\ //// along the top and //// \\\\ along the bottom.
// Like real angled parking the places keep their full width across the boat, so
// each one takes width / cos(tilt) of run length and neighbouring places share
// their dividing line. A tilted place reaches sideways past its run, so the runs
// are kept back from the yard edges and from the grass by that overhang.

import { BoatData, YardLayout, YardSlot } from '../types/dock';

export const YARD_SLOT_DEPTH = 10; // meters
export const YARD_TILT_DEGREES = 20;

const TILT = (YARD_TILT_DEGREES * Math.PI) / 180;
const GRASS_GAP = 3; // meters of grass between the runs
const MIDDLE_OPEN = 16; // meters of open pavement between the two rows
const WIDEST_PLACE = 3;

// Run length taken up by one place, so that adjacent angled places share an edge
const pitchFor = (width: number) => width / Math.cos(TILT);

// How deep an angled row reaches into the yard
const ROW_DEPTH = YARD_SLOT_DEPTH * Math.cos(TILT) + WIDEST_PLACE * Math.sin(TILT);

// A tilted place reaches further sideways than the run length it takes up, so
// the runs are inset by that overhang to keep every place on the pavement
const overhangFor = (width: number) =>
  (width / 2) * Math.cos(TILT) + (YARD_SLOT_DEPTH / 2) * Math.sin(TILT) - pitchFor(width) / 2;
const EDGE_MARGIN = Math.max(overhangFor(2.5), overhangFor(WIDEST_PLACE));

// The places either side of a grass strip lean towards it, so the runs are also
// kept back from the grass by that overhang. Without it the deep end of the
// place next to the grass, where the nose of the boat is, sits on the grass.
const GRASS_CLEARANCE = EDGE_MARGIN;

// Base rotation per edge: the local +Y axis has to point into the yard
const BASE_ROTATION: Record<YardSlot['edge'], number> = {
  top: 0,
  bottom: Math.PI,
  left: -Math.PI / 2,
};

interface PlaceSpec {
  number: number;
  width: number;
}

const run = (numbers: number[], width: number): PlaceSpec[] =>
  numbers.map(number => ({ number, width }));

const range = (from: number, to: number): number[] => {
  const step = from <= to ? 1 : -1;
  const out: number[] = [];
  for (let n = from; step > 0 ? n <= to : n >= to; n += step) out.push(n);
  return out;
};

// Each run is listed right to left, the direction the numbers are laid out in
const TOP_RIGHT_RUN = [...run(range(1, 7), 3), ...run(range(8, 14), 2.5)];
const TOP_LEFT_RUN = run(range(48, 40), 2.5);
const BOTTOM_RIGHT_RUN = [...run(range(15, 24), 3), ...run(range(25, 27), 2.5)];
const BOTTOM_LEFT_RUN = run(range(28, 38), 2.5);

const runLength = (specs: PlaceSpec[]) =>
  specs.reduce((total, spec) => total + pitchFor(spec.width), 0);

export function createZomerbergingYard(): YardLayout {
  // Run length taken up by a grass strip and the clearance either side of it
  const gapLength = GRASS_GAP + GRASS_CLEARANCE * 2;
  const topWidth = runLength(TOP_RIGHT_RUN) + gapLength + runLength(TOP_LEFT_RUN);
  const bottomWidth =
    runLength(BOTTOM_RIGHT_RUN) + gapLength + runLength(BOTTOM_LEFT_RUN);

  // Both rows are aligned to the right edge; the bottom row is the longer one
  const width = Math.max(topWidth, bottomWidth) + EDGE_MARGIN * 2;
  const height = ROW_DEPTH * 2 + MIDDLE_OPEN;
  const runRightX = width - EDGE_MARGIN;

  const slots: YardSlot[] = [];

  // Places lean towards the centre: the runs nearer the left lean the opposite
  // way to the runs nearer the right
  const layRun = (
    specs: PlaceSpec[],
    rightX: number,
    edge: YardSlot['edge'],
    tilt: number,
    centerY: number
  ): number => {
    let x = rightX;
    specs.forEach(spec => {
      const pitch = pitchFor(spec.width);
      slots.push({
        number: spec.number,
        edge,
        centerX: x - pitch / 2,
        centerY,
        width: spec.width,
        depth: YARD_SLOT_DEPTH,
        bayRotation: BASE_ROTATION[edge] + tilt,
      });
      x -= pitch;
    });
    return x;
  };

  const topCenterY = ROW_DEPTH / 2;
  const bottomCenterY = height - ROW_DEPTH / 2;

  let x = layRun(TOP_RIGHT_RUN, runRightX, 'top', TILT, topCenterY);
  x -= GRASS_CLEARANCE;
  const topGrass = { x: x - GRASS_GAP, y: 0, width: GRASS_GAP, height: ROW_DEPTH };
  x -= GRASS_GAP + GRASS_CLEARANCE;
  layRun(TOP_LEFT_RUN, x, 'top', -TILT, topCenterY);

  x = layRun(BOTTOM_RIGHT_RUN, runRightX, 'bottom', -TILT, bottomCenterY);
  x -= GRASS_CLEARANCE;
  const bottomGrass = {
    x: x - GRASS_GAP,
    y: height - ROW_DEPTH,
    width: GRASS_GAP,
    height: ROW_DEPTH,
  };
  x -= GRASS_GAP + GRASS_CLEARANCE;
  layRun(BOTTOM_LEFT_RUN, x, 'bottom', TILT, bottomCenterY);

  // Place 39 sits on the left edge, vertically centred, already facing the
  // centre of the yard, so it is not tilted
  slots.push({
    number: 39,
    edge: 'left',
    centerX: EDGE_MARGIN + YARD_SLOT_DEPTH / 2,
    centerY: height / 2,
    width: 2.5,
    depth: YARD_SLOT_DEPTH,
    bayRotation: BASE_ROTATION.left,
  });

  return { width, height, slots, grassStrips: [topGrass, bottomGrass] };
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
  // The height allowance leaves room for the name labels, which sit outside the
  // yard. On screen the width is what binds, so this only matters for the print
  // canvas, which is much wider than it is tall.
  const scale = Math.min(
    (canvasWidth * 0.92) / yard.width,
    (canvasHeight * 0.76) / yard.height
  );
  return {
    scale,
    offsetX: (canvasWidth - yard.width * scale) / 2,
    offsetY: (canvasHeight - yard.height * scale) / 2,
  };
}

// A rectangle in yard meters that may be rotated about its centre
export interface YardOrientedRect {
  centerX: number;
  centerY: number;
  width: number; // local X extent
  height: number; // local Y extent
  rotation: number;
}

export const MOORING_BOX_DEPTH = 2; // meters, matches the 2m mooring boxes on the other quays

export function getSlotByNumber(yard: YardLayout, slotNumber: number): YardSlot | undefined {
  return yard.slots.find(s => s.number === slotNumber);
}

export function isBoatCompatibleWithSlot(boat: BoatData, slot: YardSlot): boolean {
  const epsilon = 1e-9;
  return boat.width <= slot.width + epsilon && boat.length <= slot.depth + epsilon;
}

// The place itself
export function getSlotRect(slot: YardSlot): YardOrientedRect {
  return {
    centerX: slot.centerX,
    centerY: slot.centerY,
    width: slot.width,
    height: slot.depth,
    rotation: slot.bayRotation,
  };
}

// The dashed mooring box that marks a free place. As on the other quays this
// box is both the marker and the click target for placing a boat.
export function getBerthMooringBoxRect(slot: YardSlot): YardOrientedRect {
  return {
    centerX: slot.centerX,
    centerY: slot.centerY,
    width: slot.width - 0.4,
    height: MOORING_BOX_DEPTH,
    rotation: slot.bayRotation,
  };
}

// A boat parked in a place: its length runs into the yard, so it follows the
// tilt of the place it stands on
export function getPlacedBoatRect(boat: BoatData, slot: YardSlot): YardOrientedRect {
  return {
    centerX: slot.centerX,
    centerY: slot.centerY,
    width: boat.width,
    height: boat.length,
    rotation: slot.bayRotation,
  };
}

// The rotation to draw a boat with, so its nose points into the yard
export function getBoatRotationInSlot(slot: YardSlot): number {
  return slot.bayRotation - Math.PI / 2;
}

// Lay out boats that have no place yet in the open middle area, in centered
// rows so the user can pick them up and place them.
export function getUnplacedBoatRects(
  yard: YardLayout,
  unplacedBoats: BoatData[]
): Map<string, YardOrientedRect> {
  const rects = new Map<string, YardOrientedRect>();
  if (unplacedBoats.length === 0) return rects;

  const gap = 1;
  const rowPadding = 1.5;
  const maxRowWidth = yard.width * 0.6;
  const centerX = yard.width / 2 + 4; // nudge right, away from place 39
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
    const rowWidth = row.reduce((sum, b) => sum + b.length, 0) + gap * (row.length - 1);
    let x = centerX - rowWidth / 2;
    const rowCenterY = y + rowHeights[rowIndex] / 2;
    row.forEach(boat => {
      rects.set(boat.id, {
        centerX: x + boat.length / 2,
        centerY: rowCenterY,
        width: boat.length,
        height: boat.width,
        rotation: 0,
      });
      x += boat.length + gap;
    });
    y += rowHeights[rowIndex];
  });

  return rects;
}

export function isPointInOrientedRect(
  px: number,
  py: number,
  rect: YardOrientedRect
): boolean {
  const dx = px - rect.centerX;
  const dy = py - rect.centerY;
  const cos = Math.cos(-rect.rotation);
  const sin = Math.sin(-rect.rotation);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  return Math.abs(localX) <= rect.width / 2 && Math.abs(localY) <= rect.height / 2;
}
