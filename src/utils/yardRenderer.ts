// Rendering for yard docks (Zomerberging): a paved storage area surrounded by
// grass, with fixed numbered boat locations along the edges.

import { BoatData, YardLayout, YardSlot } from '../types/dock';
import { drawBoatHull } from './boatRenderer';
import {
  YardTransform,
  getPlacedBoatRect,
  getSlotRect,
  getUnplacedBoatRects,
  isBoatCompatibleWithSlot,
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

const YARD_CORNER_RADIUS = 3; // meters, rounded top-left corner as in the sketch

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

  // === GRASS BACKGROUND ===
  const grassGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  grassGradient.addColorStop(0, '#5a8c3a');
  grassGradient.addColorStop(0.4, '#4a7c2e');
  grassGradient.addColorStop(1, '#3d6b25');
  ctx.fillStyle = grassGradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Grass texture
  ctx.save();
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 250; i++) {
    const x = Math.random() * canvasWidth;
    const y = Math.random() * canvasHeight;
    ctx.strokeStyle = Math.random() > 0.5 ? '#4a7c2e' : '#3d6b25';
    ctx.lineWidth = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.random() * 3 - 1.5, y - Math.random() * 10);
    ctx.stroke();
  }
  ctx.restore();

  // === PAVED YARD ===
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

  // Pavement speckle texture
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

  // Yard border
  ctx.save();
  ctx.strokeStyle = 'rgba(60, 66, 74, 0.6)';
  ctx.lineWidth = 2;
  traceYardPath();
  ctx.stroke();
  ctx.restore();

  // === GRASS STRIPS INSIDE THE YARD ===
  yard.grassStrips.forEach(strip => {
    ctx.save();
    ctx.fillStyle = '#4a7c2e';
    ctx.fillRect(px(strip.x), py(strip.y), toPx(strip.width), toPx(strip.height));
    ctx.strokeStyle = 'rgba(45, 90, 26, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px(strip.x), py(strip.y), toPx(strip.width), toPx(strip.height));
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 25; i++) {
      const x = px(strip.x + Math.random() * strip.width);
      const y = py(strip.y + Math.random() * strip.height);
      ctx.strokeStyle = '#3d6b25';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.random() * 2 - 1, y - Math.random() * 6);
      ctx.stroke();
    }
    ctx.restore();
  });

  const selectedBoat = boats.find(b => b.id === selectedBoatId) || null;
  const occupiedSlots = new Set(
    boats.filter(b => b.slotNumber !== undefined).map(b => b.slotNumber)
  );

  // === SLOT MARKINGS ===
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(1.5, toPx(0.12));
  yard.slots.forEach(slot => {
    const rect = getSlotRect(slot);
    ctx.beginPath();
    if (slot.edge === 'top') {
      // Side dividers running into the yard, open end at the inside
      ctx.moveTo(px(rect.x), py(rect.y));
      ctx.lineTo(px(rect.x), py(rect.y + rect.height));
      ctx.moveTo(px(rect.x + rect.width), py(rect.y));
      ctx.lineTo(px(rect.x + rect.width), py(rect.y + rect.height));
    } else if (slot.edge === 'bottom') {
      ctx.moveTo(px(rect.x), py(rect.y + rect.height));
      ctx.lineTo(px(rect.x), py(rect.y));
      ctx.moveTo(px(rect.x + rect.width), py(rect.y + rect.height));
      ctx.lineTo(px(rect.x + rect.width), py(rect.y));
    } else {
      // Left edge slot: dividers run horizontally into the yard
      ctx.moveTo(px(rect.x), py(rect.y));
      ctx.lineTo(px(rect.x + rect.width), py(rect.y));
      ctx.moveTo(px(rect.x), py(rect.y + rect.height));
      ctx.lineTo(px(rect.x + rect.width), py(rect.y + rect.height));
    }
    ctx.stroke();
  });
  ctx.restore();

  // === FREE SLOT HIGHLIGHTS (a boat is selected and can be placed) ===
  if (selectedBoat) {
    yard.slots.forEach(slot => {
      if (occupiedSlots.has(slot.number)) return;
      if (!isBoatCompatibleWithSlot(selectedBoat, slot)) return;
      const rect = getSlotRect(slot);
      const inset = toPx(0.3);
      ctx.save();
      ctx.fillStyle = 'rgba(134, 239, 172, 0.25)';
      ctx.fillRect(
        px(rect.x) + inset,
        py(rect.y) + inset,
        toPx(rect.width) - inset * 2,
        toPx(rect.height) - inset * 2
      );
      ctx.strokeStyle = 'rgba(22, 163, 74, 0.9)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        px(rect.x) + inset,
        py(rect.y) + inset,
        toPx(rect.width) - inset * 2,
        toPx(rect.height) - inset * 2
      );
      ctx.restore();
    });
  }

  // === SLOT NUMBERS ===
  if (showLabels) {
    ctx.save();
    ctx.font = `bold ${Math.max(9, toPx(1.1))}px system-ui`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 2;
    yard.slots.forEach(slot => {
      const rect = getSlotRect(slot);
      let x: number;
      let y: number;
      if (slot.edge === 'top') {
        x = px(rect.x + rect.width / 2);
        y = py(rect.y + 1.1);
      } else if (slot.edge === 'bottom') {
        x = px(rect.x + rect.width / 2);
        y = py(rect.y + rect.height - 1.1);
      } else {
        x = px(rect.x + 1.1);
        y = py(rect.y + rect.height / 2);
      }
      ctx.fillText(slot.number.toString(), x, y);
    });
    ctx.restore();
  }

  // === BOATS ===
  const slotsByNumber = new Map<number, YardSlot>(yard.slots.map(s => [s.number, s]));
  const unplacedBoats = boats.filter(b => b.slotNumber === undefined);
  const unplacedRects = getUnplacedBoatRects(yard, unplacedBoats);

  boats.forEach(boat => {
    const isSelected = boat.id === selectedBoatId;
    const isHovered = boat.id === hoveredBoatId;
    const numberFontSize = Math.max(11, toPx(1.2));

    let centerXpx: number;
    let centerYpx: number;
    let rotation: number; // hull nose points to -X before rotation

    const slot = boat.slotNumber !== undefined ? slotsByNumber.get(boat.slotNumber) : undefined;
    if (slot) {
      const rect = getSlotRect(slot);
      centerXpx = px(rect.x + rect.width / 2);
      centerYpx = py(rect.y + rect.height / 2);
      if (slot.edge === 'top') {
        rotation = Math.PI / 2; // nose up, pointing out of the yard
      } else if (slot.edge === 'bottom') {
        rotation = -Math.PI / 2; // nose down
      } else {
        rotation = 0; // nose left
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
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
    }
    drawBoatHull(ctx, boat.length * scale, boat.width * scale, {
      isSelected,
      numberLabel: slot ? slot.number.toString() : undefined,
      textRotation: -rotation, // keep the number upright on screen
      numberFontSize,
    });
    ctx.restore();

    // Name label
    if (showTextLabels && boat.name) {
      drawYardBoatLabel(ctx, boat, slot, centerXpx, centerYpx, scale);
    }
  });
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
    // Horizontal boat: label below
    ctx.translate(0, halfWidthPx + margin + 8);
  } else if (slot.edge === 'top') {
    // Vertical boat: label flows down-right into the open yard, slightly angled
    ctx.translate(0, halfLengthPx + margin);
    rotation = (70 * Math.PI) / 180;
  } else {
    // Bottom slots: label flows up-right into the open yard
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

  // Anchor: rotated labels start at the anchor point; horizontal labels center
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
