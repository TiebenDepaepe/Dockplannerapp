// Boat rendering utilities

import { BoatData, DockGeometry } from '../types/dock';
import { getFingerDockGeometry, getMooringZoneGeometry } from './dockGeometry';

interface BoatRenderParams {
  ctx: CanvasRenderingContext2D;
  boat: BoatData;
  geometry: DockGeometry;
  startX: number;
  startY: number;
  scale: number;
  dockThickness: number;
  dockGap?: number;
  isHovered?: boolean;
  isDragged?: boolean;
  isSelected?: boolean;
  isRestricted?: boolean;
  rotationOffset?: number; // Additional rotation (e.g., for perpendicular parking)
  showTextLabel?: boolean;
}

// Draw a single boat
export function drawBoat({
  ctx,
  boat,
  geometry,
  startX,
  startY,
  scale,
  dockThickness,
  dockGap = 2,
  isHovered = false,
  isDragged = false,
  isSelected = false,
  isRestricted = false,
  rotationOffset = 0,
  showTextLabel = false,
}: BoatRenderParams) {
  let centerPoint: { x: number; y: number; angle: number };
  let isMooredToZone = false;

  // Check if boat is moored to a finger dock zone
  if (boat.mooringType === 'finger' && 
      boat.fingerDockIndex !== undefined && 
      boat.mooringSide && 
      geometry.config.fingerDocks && 
      geometry.config.fingerDocks[boat.fingerDockIndex]) {
    
    const fd = geometry.config.fingerDocks[boat.fingerDockIndex];
    const fdGeom = getFingerDockGeometry(geometry, startX, startY, scale, dockThickness, fd);
    const zoneGeom = getMooringZoneGeometry(fdGeom, boat.mooringSide, scale);
    
    centerPoint = {
      x: zoneGeom.x,
      y: zoneGeom.y,
      // Align boat with finger dock (pointing outward)
      // Base boat points Left (-X), so using the dock angle rotates it to point "downwards" (opposite to dock direction)
      // because -X rotated by -90 deg becomes +Y (Down).
      angle: zoneGeom.angle
    };
    isMooredToZone = true;
  } else {
    // Get the position and angle at the boat's center (Main Dock)
    const boatCenter = boat.position + boat.length / 2;
    centerPoint = geometry.getPointAtDistance(boatCenter, startX, startY, scale);
  }

  // Calculate boat dimensions in pixels
  const boatLengthPx = boat.length * scale;
  const boatWidthPx = boat.width * scale;

  ctx.save();

  // Translate to boat center and rotate
  ctx.translate(centerPoint.x, centerPoint.y);
  ctx.rotate(centerPoint.angle + rotationOffset);

  // Offset the boat perpendicular to the dock (to the side, not on top)
  // Only apply this if NOT moored to a zone (since zones are already positioned correctly)
  if (!isMooredToZone) {
    const perpOffset = -(dockThickness / 2 + dockGap + boatWidthPx / 2);
    ctx.translate(0, perpOffset);
  }

  // Check if boat should be flipped (nose to right)
  // Use config defaultOrientation if available
  const isFlipped = geometry.config.defaultOrientation === 'flipped';
  if (isFlipped) {
    ctx.scale(-1, 1);
  }

  // Apply shadow effect for hover/drag
  if (isHovered || isDragged) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;
  }

  // Set opacity if restricted
  if (isRestricted) {
    ctx.globalAlpha = 0.6;
  }

  // Define boat path
  ctx.beginPath();
  const halfLength = boatLengthPx / 2;
  const halfWidth = boatWidthPx / 2;

  // Bow (left, pointed)
  ctx.moveTo(-halfLength, 0);
  // Top edge
  ctx.quadraticCurveTo(-halfLength * 0.7, -halfWidth * 0.8, -halfLength * 0.2, -halfWidth * 0.95);
  ctx.lineTo(halfLength * 0.7, -halfWidth * 0.8);
  // Stern (right, rounded)
  ctx.quadraticCurveTo(halfLength, -halfWidth * 0.7, halfLength, 0);
  ctx.quadraticCurveTo(halfLength, halfWidth * 0.7, halfLength * 0.7, halfWidth * 0.8);
  // Bottom edge
  ctx.lineTo(-halfLength * 0.2, halfWidth * 0.95);
  ctx.quadraticCurveTo(-halfLength * 0.7, halfWidth * 0.8, -halfLength, 0);
  ctx.closePath();

  // Boat hull fill
  ctx.fillStyle = isSelected ? '#FCD34D' : '#FFFFFF';
  ctx.fill();

  // Boat outline
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Boat shading for 3D effect
  const shineGradient = ctx.createLinearGradient(0, -halfWidth, 0, halfWidth);
  shineGradient.addColorStop(0, 'rgba(200, 220, 240, 0.4)');
  shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  shineGradient.addColorStop(1, 'rgba(100, 120, 140, 0.2)');
  ctx.fillStyle = shineGradient;

  ctx.beginPath();
  ctx.moveTo(-halfLength, 0);
  ctx.quadraticCurveTo(-halfLength * 0.7, -halfWidth * 0.8, -halfLength * 0.2, -halfWidth * 0.95);
  ctx.lineTo(halfLength * 0.7, -halfWidth * 0.8);
  ctx.quadraticCurveTo(halfLength, -halfWidth * 0.7, halfLength, 0);
  ctx.quadraticCurveTo(halfLength, halfWidth * 0.7, halfLength * 0.7, halfWidth * 0.8);
  ctx.lineTo(-halfLength * 0.2, halfWidth * 0.95);
  ctx.quadraticCurveTo(-halfLength * 0.7, halfWidth * 0.8, -halfLength, 0);
  ctx.closePath();
  ctx.fill();

  // Boat number
  ctx.save();
  if (isFlipped) {
    ctx.scale(-1, 1); // Flip text back so it's not mirrored
  }
  ctx.font = 'bold 14px system-ui';
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(boat.number.toString(), 0, 0);
  ctx.restore();

  // Floating label with boat name
  if (showTextLabel && boat.name) {
    ctx.save();
    
    // Undo flip if necessary
    if (isFlipped) {
      ctx.scale(-1, 1);
    }

    // Rotate back to align with screen axes
    const totalRotation = centerPoint.angle + rotationOffset;
    ctx.rotate(-totalRotation);

    // Calculate vertical offset to clear the boat
    const halfLen = boatLengthPx / 2;
    const halfWid = boatWidthPx / 2;
    // Calculate max vertical extent of the rotated boat box
    const verticalExtent = Math.abs(Math.sin(totalRotation) * halfLen) + Math.abs(Math.cos(totalRotation) * halfWid);
    
    let labelOffset = verticalExtent + 15; // Increased margin
    let xOffset = 0;

    // Calculate normalized dock angle for reuse
    let normDeg = 0;
    if (boat.mooringType !== 'finger') {
        const dockAngleRad = Math.abs(centerPoint.angle % Math.PI);
        const angleDeg = (dockAngleRad * 180) / Math.PI;
        normDeg = angleDeg > 90 ? 180 - angleDeg : angleDeg;
    }

    // Adjust for angled docks (per user request)
    // < 45 deg: reduce Y by 1/3, add 2/3 to X
    // > 45 deg: reduce Y to 0, add all to X
    if (boat.mooringType !== 'finger' && normDeg > 5) {
        if (normDeg < 45) {
            xOffset = labelOffset * (2/3);
            labelOffset = labelOffset * (2/3); // Reduced to 2/3
        } else {
            xOffset = labelOffset;
            labelOffset = 0;
        }
    }

    // Determine rotation angle based on dock angle
    // For ~90 degree docks, use 70 degrees instead of 90 for better readability
    let labelRotation = Math.PI / 2; // Default 90 degrees (vertical text)
    if (normDeg >= 85 && normDeg <= 90) {
        labelRotation = (70 * Math.PI) / 180; // 70 degrees for ~90° docks
    }

    // Rotate for vertical text (Top-to-Bottom)
    ctx.rotate(labelRotation);

    // Draw background pill
    const isFingerMoored = boat.mooringType === 'finger';
    const fontSize = isFingerMoored ? 12 : 14;
    const bgHeight = isFingerMoored ? 14 : 20;

    ctx.font = `bold ${fontSize}px system-ui`;
    const metrics = ctx.measureText(boat.name);
    const paddingX = 5;
    const bgWidth = metrics.width + paddingX * 2;

    let bgX = -labelOffset - bgWidth;
    const bgY = -bgHeight / 2 - xOffset; 

    // For ~90 degree docks, center the label instead of right-aligning it
    if (normDeg >= 85 && normDeg <= 90) {
        bgX = -bgWidth / 2; // Center the label
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // Draw rounded rect
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

    // Draw text
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(boat.name, bgX + paddingX, -xOffset);

    ctx.restore();
  }

  ctx.restore();
}

// Draw distance guides between consecutive boats
export function drawDistanceGuides(
  ctx: CanvasRenderingContext2D,
  boats: BoatData[],
  geometry: DockGeometry,
  startX: number,
  startY: number,
  scale: number,
  dockThickness: number,
  dockGap: number = 2
) {
  // Filter out moored boats and sort by position
  const sortedBoats = boats
    .filter(b => b.mooringType !== 'finger')
    .sort((a, b) => a.position - b.position);

  for (let i = 0; i < sortedBoats.length - 1; i++) {
    const boat1 = sortedBoats[i];
    const boat2 = sortedBoats[i + 1];

    const boat1End = boat1.position + boat1.length;
    const boat2Start = boat2.position;
    const gap = boat2Start - boat1End;

    if (gap > 0.1) {
      // Check if a finger dock is in between the boats
      // If so, don't draw the line and label
      const hasFingerDock = geometry.config.fingerDocks?.some(fd => 
        fd.position > boat1End && fd.position < boat2Start
      );

      if (hasFingerDock) {
        continue;
      }

      // Draw line along the dock between the boats
      const gapSamples = Math.max(10, Math.floor(gap * 2));

      // Calculate offsets for boat1 and boat2
      // Offset is negative (perpOffset in drawBoat)
      const offset1 = -(dockThickness / 2 + dockGap + (boat1.width * scale) / 2);
      const offset2 = -(dockThickness / 2 + dockGap + (boat2.width * scale) / 2);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();

      for (let j = 0; j <= gapSamples; j++) {
        const t = j / gapSamples;
        const dist = boat1End + (gap * t);
        const p = geometry.getPointAtDistance(dist, startX, startY, scale);
        
        // Interpolate offset
        const currentOffset = offset1 * (1 - t) + offset2 * t;
        
        // Apply perpendicular offset
        // In drawBoat we translate (0, perpOffset) after rotating by angle.
        // This corresponds to moving in direction angle + PI/2 by perpOffset.
        const perpAngle = p.angle + Math.PI / 2;
        const px = p.x + Math.cos(perpAngle) * currentOffset;
        const py = p.y + Math.sin(perpAngle) * currentOffset;

        if (j === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }

      ctx.stroke();
      ctx.setLineDash([]);

      // Draw distance label at midpoint
      const midDist = boat1End + gap / 2;
      const midPoint = geometry.getPointAtDistance(midDist, startX, startY, scale);
      
      // Calculate midpoint offset
      const midOffset = (offset1 + offset2) / 2;
      
      const perpAngle = midPoint.angle + Math.PI / 2;
      const labelX = midPoint.x + Math.cos(perpAngle) * midOffset;
      const labelY = midPoint.y + Math.sin(perpAngle) * midOffset;

      ctx.font = '12px system-ui';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.translate(labelX, labelY);
      ctx.rotate(midPoint.angle);
      // Move label "above" the line (further negative relative to rotated Y)
      // Since midOffset is negative, and we want to go further away, we subtract.
      ctx.fillText(`${gap.toFixed(1)}m`, 0, -15);
      ctx.restore();
    }
  }
}