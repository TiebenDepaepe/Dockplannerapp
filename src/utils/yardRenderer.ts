// Rendering for yard docks (Zomerberging): a paved storage yard with fixed
// numbered parking places around the edges. The boats stand on the pavement,
// so the places are painted bays rather than docks.
//
// Visual language follows the other quays where it applies: dashed white
// mooring boxes mark the free places, and the grass, beach and rock treatment
// is the same as where a dock meets the land.

import { BoatData, YardLayout, YardSlot } from '../types/dock';
import { drawBoatHull } from './boatRenderer';
import {
  YardTransform,
  getBerthMooringBoxRect,
  getSlotRect,
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
  const beachInset = 26;
  ctx.strokeStyle = 'rgba(222, 193, 148, 0.55)';
  ctx.lineWidth = beachInset;
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

  const occupiedSlots = new Set(
    boats.filter(b => b.slotNumber !== undefined).map(b => b.slotNumber)
  );

  // === PAINTED PARKING BAYS ===
  yard.slots.forEach(slot => drawBerthBay(ctx, slot, px, py, toPx, showLabels));

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

    let centerXpx: number;
    let centerYpx: number;
    let rotation: number; // hull nose points to -X before rotation

    const slot = boat.slotNumber !== undefined ? slotsByNumber.get(boat.slotNumber) : undefined;
    if (slot) {
      const rect = getSlotRect(slot);
      centerXpx = px(rect.x + rect.width / 2);
      centerYpx = py(rect.y + rect.height / 2);
      if (slot.edge === 'top') {
        rotation = Math.PI / 2; // nose pointing out of the yard
      } else if (slot.edge === 'bottom') {
        rotation = -Math.PI / 2;
      } else {
        rotation = 0;
      }
    } else {
      const rect = unplacedRects.get(boat.id);
      if (!rect) return;
      centerXpx = px(rect.x + rect.width / 2);
      centerYpx = py(rect.y + rect.height / 2);
      rotation = 0;
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

// One parking place: pavement marked out with painted lines, open at the side
// the boat drives in from
function drawBerthBay(
  ctx: CanvasRenderingContext2D,
  slot: YardSlot,
  px: (m: number) => number,
  py: (m: number) => number,
  toPx: (m: number) => number,
  showLabels: boolean
) {
  const rect = getSlotRect(slot);
  const x = px(rect.x);
  const y = py(rect.y);
  const w = toPx(rect.width);
  const h = toPx(rect.height);

  ctx.save();

  // Bays read slightly darker than the open manoeuvring area
  ctx.fillStyle = 'rgba(116, 123, 132, 0.28)';
  ctx.fillRect(x, y, w, h);

  // Painted markings: the two dividing lines plus the closed end,
  // left open where the boat drives in
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(1.5, toPx(0.12));
  ctx.beginPath();
  if (slot.edge === 'left') {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    const closedY = slot.edge === 'top' ? y : y + h;
    ctx.moveTo(x, closedY);
    ctx.lineTo(x + w, closedY);
  }
  ctx.stroke();

  // Place number painted on the pavement
  if (showLabels) {
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let labelX: number;
    let labelY: number;
    if (slot.edge === 'top') {
      labelX = x + w / 2;
      labelY = y + toPx(1.1);
    } else if (slot.edge === 'bottom') {
      labelX = x + w / 2;
      labelY = y + h - toPx(1.1);
    } else {
      labelX = x + toPx(1.1);
      labelY = y + h / 2;
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 3;
    ctx.fillText(slot.number.toString(), labelX, labelY);
  }

  ctx.restore();
}

// Dashed white box marking a free berth, with its width label
function drawBerthMooringBox(
  ctx: CanvasRenderingContext2D,
  slot: YardSlot,
  px: (m: number) => number,
  py: (m: number) => number,
  toPx: (m: number) => number,
  showLabels: boolean
) {
  const box = getBerthMooringBoxRect(slot);

  ctx.save();
  // Slightly stronger than the 0.6 used on wood and water, which washes out
  // against the pale pavement
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.setLineDash([2, 2]);
  ctx.lineWidth = 1;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 2;
  ctx.strokeRect(px(box.x), py(box.y), toPx(box.width), toPx(box.height));
  ctx.setLineDash([]);

  if (showLabels) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${slot.width}m`, px(box.x + box.width / 2), py(box.y + box.height / 2));
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
  const halfLengthPx = (boat.length * scale) / 2;
  const halfWidthPx = (boat.width * scale) / 2;
  const margin = 8;

  ctx.save();
  ctx.translate(centerXpx, centerYpx);

  let rotation = 0;
  if (!slot || slot.edge === 'left') {
    // Boat lies horizontally: label sits below it
    ctx.translate(0, halfWidthPx + margin + 8);
  } else if (slot.edge === 'top') {
    // Vertical boat: label runs into the open yard, angled as on the other quays
    ctx.translate(0, halfLengthPx + margin);
    rotation = (70 * Math.PI) / 180;
  } else {
    ctx.translate(0, -halfLengthPx - margin);
    rotation = (-70 * Math.PI) / 180;
  }
  ctx.rotate(rotation);

  const fontSize = 12;
  const bgHeight = 16;
  ctx.font = `bold ${fontSize}px system-ui`;
  const metrics = ctx.measureText(boat.name);
  const paddingX = 5;
  const bgWidth = metrics.width + paddingX * 2;

  const bgX = rotation === 0 ? -bgWidth / 2 : 0;
  const bgY = -bgHeight / 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  const r = 3;
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
  ctx.fillText(boat.name, bgX + paddingX, 0);

  ctx.restore();
}
