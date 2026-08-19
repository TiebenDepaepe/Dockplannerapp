// Rendering for yard docks (Zomerberging): a paved storage yard with fixed
// numbered parking places around the edges. The boats stand on the pavement,
// so the places are painted bays rather than docks.
//
// The bays are angled and every boat noses towards the centre of the yard, so
// each bay is drawn in its own rotated frame and the text is turned back
// upright afterwards.
//
// Visual language follows the other quays where it applies: dashed white
// mooring boxes mark the free places, and the grass, beach and rock treatment
// is the same as where a dock meets the land.

import { BoatData, YardLayout, YardSlot } from '../types/dock';
import { drawBoatHull } from './boatRenderer';
import {
  YardTransform,
  getBerthMooringBoxRect,
  getBoatRotationInSlot,
  getUnplacedBoatRects,
} from './yardLayout';

interface YardSceneParams {
  ctx: CanvasRenderingContext2D;
  yard: YardLayout;
  transform: YardTransform;
  boats: BoatData[];
  canvasWidth: number;
  canvasHeight: number;
  selectedBoatId?: string | null;
  hoveredBoatId?: string | null;
  showLabels?: boolean;
  showTextLabels?: boolean;
}

const YARD_CORNER_RADIUS = 3; // meters, rounded corner as drawn on the sketch

// Keep text the right way up on screen: turn any angle into the equivalent
// reading direction within a quarter turn of horizontal
function readableAngle(angle: number): number {
  let a = Math.atan2(Math.sin(angle), Math.cos(angle));
  if (a > Math.PI / 2) a -= Math.PI;
  else if (a <= -Math.PI / 2) a += Math.PI;
  return a;
}

export function drawYardScene({
  ctx,
  yard,
  transform,
  boats,
  canvasWidth,
  canvasHeight,
  selectedBoatId = null,
  hoveredBoatId = null,
  showLabels = true,
  showTextLabels = true,
}: YardSceneParams) {
  const { scale, offsetX, offsetY } = transform;
  const toPx = (m: number) => m * scale;
  const px = (mx: number) => offsetX + mx * scale;
  const py = (my: number) => offsetY + my * scale;

  // === GRASS (same gradient and texture as the land on the other quays) ===
  const landGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  landGradient.addColorStop(0, '#5a8c3a');
  landGradient.addColorStop(0.3, '#4a7c2e');
  landGradient.addColorStop(0.7, '#3d6b25');
  landGradient.addColorStop(1, '#2d5a1a');
  ctx.fillStyle = landGradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * canvasWidth;
    const y = Math.random() * canvasHeight;
    ctx.strokeStyle = Math.random() > 0.5 ? '#4a7c2e' : '#3d6b25';
    ctx.lineWidth = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.random() * 3 - 1.5, y - Math.random() * 12);
    ctx.stroke();
  }
  ctx.restore();

  const traceYardPath = () => {
    const r = toPx(YARD_CORNER_RADIUS);
    const x0 = px(0);
    const y0 = py(0);
    const x1 = px(yard.width);
    const y1 = py(yard.height);
    ctx.beginPath();
    ctx.moveTo(x0 + r, y0);
    ctx.lineTo(x1, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x0, y1);
    ctx.lineTo(x0, y0 + r);
    ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
    ctx.closePath();
  };

  // === SANDY TRANSITION AROUND THE YARD (as where a dock meets the land) ===
  ctx.save();
  ctx.strokeStyle = 'rgba(222, 193, 148, 0.55)';
  ctx.lineWidth = 26;
  ctx.lineJoin = 'round';
  traceYardPath();
  ctx.stroke();
  ctx.restore();

  // === PAVED YARD SURFACE ===
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  const pavementGradient = ctx.createLinearGradient(px(0), py(0), px(0), py(yard.height));
  pavementGradient.addColorStop(0, '#b3b9bf');
  pavementGradient.addColorStop(0.5, '#a8aeb5');
  pavementGradient.addColorStop(1, '#9aa0a8');
  ctx.fillStyle = pavementGradient;
  traceYardPath();
  ctx.fill();
  ctx.restore();

  // Pavement speckle
  ctx.save();
  traceYardPath();
  ctx.clip();
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 400; i++) {
    const x = px(Math.random() * yard.width);
    const y = py(Math.random() * yard.height);
    ctx.fillStyle = Math.random() > 0.5 ? '#8a9098' : '#c4cad1';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();

  // Rocks along the yard edge, same treatment as the shoreline elsewhere
  ctx.save();
  ctx.fillStyle = 'rgba(80, 80, 80, 0.6)';
  for (let m = 0; m < yard.width; m += 4) {
    if (Math.random() > 0.6) {
      const size = Math.random() * 4 + 2;
      ctx.beginPath();
      ctx.arc(px(m), py(0) - Math.random() * 8, size, 0, Math.PI * 2);
      ctx.fill();
    }
    if (Math.random() > 0.6) {
      const size = Math.random() * 4 + 2;
      ctx.beginPath();
      ctx.arc(px(m), py(yard.height) + Math.random() * 8, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(60, 66, 74, 0.5)';
  ctx.lineWidth = 2;
  traceYardPath();
  ctx.stroke();
  ctx.restore();

  const occupiedSlots = new Set(
    boats.filter(b => b.slotNumber !== undefined).map(b => b.slotNumber)
  );

  // === PAINTED PARKING BAYS ===
  // Clipped to the pavement, since an angled bay at the end of a run reaches
  // past the run itself
  ctx.save();
  traceYardPath();
  ctx.clip();
  yard.slots.forEach(slot => drawBerthBay(ctx, slot, px, py, toPx, showLabels));
  ctx.restore();

  // === GRASS STRIPS INSIDE THE YARD (the 3m gaps on the sketch) ===
  yard.grassStrips.forEach(strip => {
    ctx.save();
    ctx.fillStyle = '#4a7c2e';
    ctx.fillRect(px(strip.x), py(strip.y), toPx(strip.width), toPx(strip.height));
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 25; i++) {
      const x = px(strip.x + Math.random() * strip.width);
      const y = py(strip.y + Math.random() * strip.height);
      ctx.strokeStyle = '#3d6b25';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.random() * 2 - 1, y - Math.random() * 8);
      ctx.stroke();
    }
    ctx.restore();
  });

  // === MOORING BOXES ON FREE PLACES ===
  // Same affordance as the other quays: a dashed white box marks a free spot
  // and disappears once a boat occupies it.
  yard.slots.forEach(slot => {
    if (occupiedSlots.has(slot.number)) return;
    drawBerthMooringBox(ctx, slot, px, py, toPx, showLabels);
  });

  // === BOATS ===
  const slotsByNumber = new Map<number, YardSlot>(yard.slots.map(s => [s.number, s]));
  const unplacedBoats = boats.filter(b => b.slotNumber === undefined);
  const unplacedRects = getUnplacedBoatRects(yard, unplacedBoats);

  boats.forEach(boat => {
    const isSelected = boat.id === selectedBoatId;
    const isHovered = boat.id === hoveredBoatId;

    const slot = boat.slotNumber !== undefined ? slotsByNumber.get(boat.slotNumber) : undefined;
    let centerXpx: number;
    let centerYpx: number;
    let rotation: number; // hull nose points to -X before rotation

    if (slot) {
      centerXpx = px(slot.centerX);
      centerYpx = py(slot.centerY);
      rotation = getBoatRotationInSlot(slot);
    } else {
      const rect = unplacedRects.get(boat.id);
      if (!rect) return;
      centerXpx = px(rect.centerX);
      centerYpx = py(rect.centerY);
      rotation = rect.rotation;
    }

    ctx.save();
    ctx.translate(centerXpx, centerYpx);
    ctx.rotate(rotation);
    if (isHovered || isSelected) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
    }
    drawBoatHull(ctx, boat.length * scale, boat.width * scale, {
      isSelected,
      numberLabel: slot ? slot.number.toString() : undefined,
      textRotation: -rotation, // keep the number upright on screen
    });
    ctx.restore();

    if (showTextLabels && boat.name) {
      drawYardBoatLabel(ctx, boat, slot, centerXpx, centerYpx, scale);
    }
  });
}

// One parking place: pavement marked out with painted lines, angled so the
// boat noses towards the centre of the yard
function drawBerthBay(
  ctx: CanvasRenderingContext2D,
  slot: YardSlot,
  px: (m: number) => number,
  py: (m: number) => number,
  toPx: (m: number) => number,
  showLabels: boolean
) {
  const halfWidth = toPx(slot.width) / 2;
  const halfDepth = toPx(slot.depth) / 2;

  ctx.save();
  ctx.translate(px(slot.centerX), py(slot.centerY));
  ctx.rotate(slot.bayRotation);

  // Bays read slightly darker than the open manoeuvring area
  ctx.fillStyle = 'rgba(116, 123, 132, 0.28)';
  ctx.fillRect(-halfWidth, -halfDepth, halfWidth * 2, halfDepth * 2);

  // Painted markings: the two dividing lines plus the closed end the boat
  // backs up to, left open on the side it drives in from
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(1.5, toPx(0.12));
  ctx.beginPath();
  ctx.moveTo(-halfWidth, -halfDepth);
  ctx.lineTo(-halfWidth, halfDepth);
  ctx.moveTo(halfWidth, -halfDepth);
  ctx.lineTo(halfWidth, halfDepth);
  ctx.moveTo(-halfWidth, -halfDepth);
  ctx.lineTo(halfWidth, -halfDepth);
  ctx.stroke();

  // Place number painted near the closed end, turned upright to stay readable
  if (showLabels) {
    ctx.translate(0, -halfDepth + toPx(1.1));
    ctx.rotate(-slot.bayRotation);
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 3;
    ctx.fillText(slot.number.toString(), 0, 0);
  }

  ctx.restore();
}

// Dashed white box marking a free place, with its width label
function drawBerthMooringBox(
  ctx: CanvasRenderingContext2D,
  slot: YardSlot,
  px: (m: number) => number,
  py: (m: number) => number,
  toPx: (m: number) => number,
  showLabels: boolean
) {
  const box = getBerthMooringBoxRect(slot);
  const w = toPx(box.width);
  const h = toPx(box.height);

  ctx.save();
  ctx.translate(px(box.centerX), py(box.centerY));
  ctx.rotate(box.rotation);

  // Slightly stronger than the 0.6 used on wood and water, which washes out
  // against the pale pavement
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.setLineDash([2, 2]);
  ctx.lineWidth = 1;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.setLineDash([]);

  if (showLabels) {
    ctx.rotate(-box.rotation);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${slot.width}m`, 0, 0);
  }
  ctx.restore();
}

function drawYardBoatLabel(
  ctx: CanvasRenderingContext2D,
  boat: BoatData,
  slot: YardSlot | undefined,
  centerXpx: number,
  centerYpx: number,
  scale: number
) {
  const fontSize = 12;
  const bgHeight = 16;
  const paddingX = 5;
  const margin = 8;

  ctx.save();
  ctx.font = `bold ${fontSize}px system-ui`;
  const bgWidth = ctx.measureText(boat.name).width + paddingX * 2;

  ctx.translate(centerXpx, centerYpx);

  if (!slot) {
    // Waiting in the open middle: label sits below the boat
    ctx.translate(0, (boat.width * scale) / 2 + margin + bgHeight / 2);
  } else {
    // Sit just beyond the closed end of the place, out on the grass, and run the
    // text along the boat. The boats nose towards the centre, so labels placed
    // behind them fan outwards and stay clear of each other even when all 48
    // places are taken; inside the yard the two runs either side of a grass gap
    // aim at each other and their labels collide.
    // Measured from the place rather than the boat, so a row of labels lines up
    // whatever length the boats are.
    const outward = slot.bayRotation - Math.PI / 2;
    const offset = (slot.depth * scale) / 2 + margin + bgWidth / 2;
    ctx.translate(Math.cos(outward) * offset, Math.sin(outward) * offset);
    ctx.rotate(readableAngle(outward));
  }

  drawLabelPill(ctx, boat.name, bgWidth, bgHeight, paddingX);
  ctx.restore();
}

// White rounded pill with the boat name, as used on the other quays
function drawLabelPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  bgWidth: number,
  bgHeight: number,
  paddingX: number
) {
  const bgX = -bgWidth / 2;
  const bgY = -bgHeight / 2;
  const r = 3;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.moveTo(bgX + r, bgY);
  ctx.lineTo(bgX + bgWidth - r, bgY);
  ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + r);
  ctx.lineTo(bgX + bgWidth, bgY + bgHeight - r);
  ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - r, bgY + bgHeight);
  ctx.lineTo(bgX + r, bgY + bgHeight);
  ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - r);
  ctx.lineTo(bgX, bgY + r);
  ctx.quadraticCurveTo(bgX, bgY, bgX + r, bgY);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bgX + paddingX, 0);
}
