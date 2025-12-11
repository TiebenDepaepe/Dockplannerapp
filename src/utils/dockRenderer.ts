// Dock rendering utilities

import { DockGeometry, PointAndAngle, BoatData } from '../types/dock';
import { getDockPathSamples } from './dockGeometry';

interface DockRenderParams {
  ctx: CanvasRenderingContext2D;
  geometry: DockGeometry;
  startX: number;
  startY: number;
  scale: number;
  thickness: number;
  showLabels?: boolean;
  boats?: BoatData[];
}

interface SceneRenderParams {
  ctx: CanvasRenderingContext2D;
  geometry: DockGeometry;
  startX: number;
  startY: number;
  scale: number;
  thickness: number;
  canvasWidth: number;
  canvasHeight: number;
}

// Draw the complete scene with water and land properly aligned to dock
export function drawScene({ 
  ctx, 
  geometry, 
  startX, 
  startY, 
  scale, 
  thickness,
  canvasWidth,
  canvasHeight 
}: SceneRenderParams) {
  const totalLength = geometry.config.totalLength;
  
  // Sample points along the dock centerline
  const dockCenterPoints = getDockPathSamples(geometry, startX, startY, scale, 200);

  // Calculate land side (bottom/grass side) and water side (top/boat side) edges
  const landSidePoints: { x: number; y: number }[] = [];
  const waterSidePoints: { x: number; y: number }[] = [];

  dockCenterPoints.forEach(point => {
    const perpAngle = point.angle + Math.PI / 2;
    
    // Land side - extends from center to bottom edge and beyond
    const landX = point.x - Math.cos(perpAngle) * (thickness / 2);
    const landY = point.y - Math.sin(perpAngle) * (thickness / 2);
    landSidePoints.push({ x: landX, y: landY });
    
    // Water side - extends from center to top edge
    const waterX = point.x + Math.cos(perpAngle) * (thickness / 2);
    const waterY = point.y + Math.sin(perpAngle) * (thickness / 2);
    waterSidePoints.push({ x: waterX, y: waterY });
  });

  // === DRAW LAND (GRASS AREA) ===
  // Create land mass that extends from the dock to the bottom of canvas
  ctx.save();
  
  // Land gradient
  const landGradient = ctx.createLinearGradient(0, startY, 0, canvasHeight);
  landGradient.addColorStop(0, '#5a8c3a');
  landGradient.addColorStop(0.3, '#4a7c2e');
  landGradient.addColorStop(0.7, '#3d6b25');
  landGradient.addColorStop(1, '#2d5a1a');
  ctx.fillStyle = landGradient;
  
  ctx.beginPath();
  // Start from bottom left
  ctx.moveTo(0, canvasHeight);
  // Go along bottom edge
  ctx.lineTo(canvasWidth, canvasHeight);
  // Go up right side to end of dock
  ctx.lineTo(canvasWidth, landSidePoints[landSidePoints.length - 1].y);
  // Follow dock land-side edge backwards
  for (let i = landSidePoints.length - 1; i >= 0; i--) {
    ctx.lineTo(landSidePoints[i].x, landSidePoints[i].y);
  }
  // Back to start
  ctx.lineTo(0, landSidePoints[0].y);
  ctx.closePath();
  ctx.fill();
  
  // Add grass texture
  ctx.save();
  ctx.globalAlpha = 0.3;
  // Start grass below the dock to avoid drawing under it
  const grassStartY = startY + thickness / 2;
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * canvasWidth;
    const y = grassStartY + Math.random() * (canvasHeight - grassStartY);
    
    ctx.strokeStyle = Math.random() > 0.5 ? '#4a7c2e' : '#3d6b25';
    ctx.lineWidth = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.random() * 3 - 1.5, y - Math.random() * 12);
    ctx.stroke();
  }
  ctx.restore();
  
  // Add sandy beach transition along the dock edge
  const beachGradient = ctx.createLinearGradient(
    landSidePoints[0].x, 
    landSidePoints[0].y,
    landSidePoints[0].x - 30, 
    landSidePoints[0].y
  );
  beachGradient.addColorStop(0, 'rgba(222, 193, 148, 0.8)');
  beachGradient.addColorStop(0.5, 'rgba(210, 180, 140, 0.4)');
  beachGradient.addColorStop(1, 'rgba(200, 170, 130, 0)');
  
  ctx.fillStyle = beachGradient;
  ctx.beginPath();
  landSidePoints.forEach((p, i) => {
    if (i === 0) {
      ctx.moveTo(p.x, p.y);
    } else {
      ctx.lineTo(p.x, p.y);
    }
  });
  // Create beach area extending inland
  for (let i = landSidePoints.length - 1; i >= 0; i--) {
    const p = landSidePoints[i];
    const point = dockCenterPoints[i];
    const perpAngle = point.angle - Math.PI / 2;
    const beachX = p.x + Math.cos(perpAngle) * 30;
    const beachY = p.y + Math.sin(perpAngle) * 30;
    ctx.lineTo(beachX, beachY);
  }
  ctx.closePath();
  ctx.fill();
  
  // Add some rocks along the shore
  ctx.fillStyle = 'rgba(80, 80, 80, 0.6)';
  for (let i = 0; i < landSidePoints.length; i += 15) {
    const p = landSidePoints[i];
    if (Math.random() > 0.6) {
      const rockSize = Math.random() * 4 + 2;
      ctx.beginPath();
      ctx.arc(p.x + Math.random() * 10 - 5, p.y + Math.random() * 10, rockSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();

  // === DRAW WATER ===
  ctx.save();
  
  // Water gradient from top to dock
  const waterGradient = ctx.createLinearGradient(0, 0, 0, startY + 100);
  waterGradient.addColorStop(0, '#1E88E5');
  waterGradient.addColorStop(0.5, '#1565C0');
  waterGradient.addColorStop(1, '#0D47A1');
  ctx.fillStyle = waterGradient;
  
  ctx.beginPath();
  // Start from top left
  ctx.moveTo(0, 0);
  // Along top edge
  ctx.lineTo(canvasWidth, 0);
  // Down right side to end of dock
  ctx.lineTo(canvasWidth, waterSidePoints[waterSidePoints.length - 1].y);
  // Follow dock water-side edge backwards
  for (let i = waterSidePoints.length - 1; i >= 0; i--) {
    ctx.lineTo(waterSidePoints[i].x, waterSidePoints[i].y);
  }
  // Back to start
  ctx.lineTo(0, waterSidePoints[0].y);
  ctx.closePath();
  ctx.fill();

  // Water waves
  ctx.save();
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 10; i++) {
    ctx.strokeStyle = i % 2 === 0 ? '#4FC3F7' : '#29B6F6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const waveY = 50 + i * 35;
    for (let x = -100; x < canvasWidth + 100; x += 20) {
      const y = waveY + Math.sin((x + i * 10) * 0.02) * 8;
      if (x === -100) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
  
  ctx.restore();
}

// Draw the wooden dock
export function drawDock({ ctx, geometry, startX, startY, scale, thickness, showLabels = true, boats }: DockRenderParams) {
  const totalLength = geometry.config.totalLength;
  
  // Sample points along the dock to create the shape
  const samples = 200;
  const pathPoints = getDockPathSamples(geometry, startX, startY, scale, samples);
  const topPoints: PointAndAngle[] = [];
  const bottomPoints: PointAndAngle[] = [];

  pathPoints.forEach(point => {
    // Calculate perpendicular offset for dock thickness
    const perpAngle = point.angle + Math.PI / 2;
    const topX = point.x + Math.cos(perpAngle) * (thickness / 2);
    const topY = point.y + Math.sin(perpAngle) * (thickness / 2);
    const bottomX = point.x - Math.cos(perpAngle) * (thickness / 2);
    const bottomY = point.y - Math.sin(perpAngle) * (thickness / 2);

    topPoints.push({ x: topX, y: topY, angle: point.angle });
    bottomPoints.push({ x: bottomX, y: bottomY, angle: point.angle });
  });

  // Draw dock shadow in water
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  topPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y + 15);
    else ctx.lineTo(p.x, p.y + 15);
  });
  for (let i = bottomPoints.length - 1; i >= 0; i--) {
    ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y + 15);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Draw dock base with gradient
  ctx.save();
  const dockGradient = ctx.createLinearGradient(
    0,
    startY - thickness / 2,
    0,
    startY + thickness / 2
  );
  dockGradient.addColorStop(0, '#8B6F47');
  dockGradient.addColorStop(0.5, '#6F5839');
  dockGradient.addColorStop(1, '#5C4A2E');
  ctx.fillStyle = dockGradient;

  ctx.beginPath();
  topPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  for (let i = bottomPoints.length - 1; i >= 0; i--) {
    ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Draw restricted zones on dock
  if (geometry.config.restrictedZones) {
    ctx.save();
    geometry.config.restrictedZones.forEach(zone => {
      // Create path for the zone
      const zoneStartIdx = Math.floor((zone.start / totalLength) * samples);
      const zoneEndIdx = Math.ceil(((zone.start + zone.length) / totalLength) * samples);
      
      // Clamp indices
      const startIdx = Math.max(0, Math.min(samples, zoneStartIdx));
      const endIdx = Math.max(0, Math.min(samples, zoneEndIdx));
      
      if (startIdx >= endIdx) return;

      ctx.beginPath();
      // Top edge of zone
      for (let i = startIdx; i <= endIdx; i++) {
        if (i === startIdx) ctx.moveTo(topPoints[i].x, topPoints[i].y);
        else ctx.lineTo(topPoints[i].x, topPoints[i].y);
      }
      // Bottom edge of zone (reverse)
      for (let i = endIdx; i >= startIdx; i--) {
        ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
      }
      ctx.closePath();

      // Draw hatched pattern
      ctx.save();
      ctx.clip();
      
      // Background highlight
      ctx.fillStyle = 'rgba(255, 100, 100, 0.15)';
      ctx.fill();

      // Diagonal stripes
      ctx.strokeStyle = 'rgba(200, 50, 50, 0.4)';
      ctx.lineWidth = 2;
      
      const regionWidth = (zone.length * scale);
      const centerX = topPoints[Math.floor((startIdx + endIdx) / 2)].x;
      const centerY = topPoints[Math.floor((startIdx + endIdx) / 2)].y;
      
      // Simply draw lines across the bounding box of the canvas to ensure coverage, clipped to zone
      const diagonalSize = Math.max(ctx.canvas.width, ctx.canvas.height);
      for (let i = -diagonalSize; i < diagonalSize; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, -diagonalSize);
        ctx.lineTo(i + diagonalSize * 2, diagonalSize);
        ctx.stroke();
      }
      
      ctx.restore();

      // Border for the zone
      ctx.strokeStyle = 'rgba(200, 50, 50, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.restore();
  }

  // Draw finger docks
  if (geometry.config.fingerDocks) {
    geometry.config.fingerDocks.forEach((fd, index) => {
      const point = geometry.getPointAtDistance(fd.position, startX, startY, scale);
      
      // Determine side direction (+1 for right/water, -1 for left/land)
      const sideDir = fd.side === 'right' ? 1 : -1;
      const dockNormal = point.angle + (Math.PI / 2) * sideDir;
      
      // Calculate start point on the edge of the main dock
      const edgeX = point.x + Math.cos(dockNormal) * (thickness / 2);
      const edgeY = point.y + Math.sin(dockNormal) * (thickness / 2);
      
      // Finger dock dimensions in pixels
      const lengthPx = fd.length * scale;
      const widthPx = fd.width * scale;

      // Calculate center in world coordinates for the horizontal label
      const centerX = edgeX + Math.cos(dockNormal) * (lengthPx / 2);
      const centerY = edgeY + Math.sin(dockNormal) * (lengthPx / 2);
      
      ctx.save();
      ctx.translate(edgeX, edgeY);
      ctx.rotate(dockNormal); // Rotate to face outward
      
      // Draw dock base
      const fingerGradient = ctx.createLinearGradient(
        0, -widthPx / 2,
        0, widthPx / 2
      );
      fingerGradient.addColorStop(0, '#8B6F47');
      fingerGradient.addColorStop(0.5, '#6F5839');
      fingerGradient.addColorStop(1, '#5C4A2E');
      ctx.fillStyle = fingerGradient;
      
      ctx.beginPath();
      ctx.rect(0, -widthPx / 2, lengthPx, widthPx);
      ctx.fill();
      
      // Add border/planks
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw planks on finger dock
      ctx.beginPath();
      for (let i = 0; i <= lengthPx; i += 5) {
        ctx.moveTo(i, -widthPx / 2);
        ctx.lineTo(i, widthPx / 2);
      }
      ctx.stroke();

      // Draw dotted line boxes (mooring zones) centered along the finger dock
      // Box size: 2m x 2m
      const boxSize = 2 * scale;
      const boxGap = 4; // Margin from dock
      const boxX = (lengthPx - boxSize) / 2; // Centered along length
      
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;
      
      // Box 1 (Left/Top side in local coords)
      // Positioned with margin from the dock edge
      if (!fd.hideLeftMooringZone) {
        const isOccupied = boats?.some(b => 
          b.dockId === geometry.config.id && 
          b.mooringType === 'finger' && 
          b.fingerDockIndex === index && 
          b.mooringSide === 'left'
        );

        if (!isOccupied) {
          ctx.strokeRect(boxX, -widthPx / 2 - boxSize - boxGap, boxSize, boxSize);
        }
      }
      
      // Box 2 (Right/Bottom side in local coords)
      // Positioned with margin from the dock edge
      if (!fd.hideRightMooringZone) {
        const isOccupied = boats?.some(b => 
          b.dockId === geometry.config.id && 
          b.mooringType === 'finger' && 
          b.fingerDockIndex === index && 
          b.mooringSide === 'right'
        );

        if (!isOccupied) {
          ctx.strokeRect(boxX, widthPx / 2 + boxGap, boxSize, boxSize);
        }
      }
      
      ctx.restore();
      
      // Draw length label (vertical/rotated inside dock)
      if (showLabels) {
        ctx.save();
        ctx.translate(lengthPx / 2, 0);
        ctx.rotate(Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${fd.length}m`, 0, 0);
        ctx.restore();
      }

      ctx.restore();

      // Draw side labels (left/right) on main dock
      if (showLabels && (fd.leftLabel || fd.rightLabel)) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        if (fd.leftLabel) {
           // Position: fd.position - fd.width/2 - margin
           // If leftSpace provided, center in that space: margin = leftSpace / 2
           // Default margin 0.5m
           const margin = fd.leftSpace ? fd.leftSpace / 2 : 0.5;
           const p = geometry.getPointAtDistance(fd.position - fd.width / 2 - margin, startX, startY, scale);
           
           ctx.save();
           ctx.translate(p.x, p.y);
           // Rotate perpendicular to dock (vertical text relative to horizontal dock)
           ctx.rotate(p.angle + Math.PI / 2);
           ctx.fillText(fd.leftLabel, 0, 0);
           ctx.restore();
        }

        if (fd.rightLabel) {
           // Position: fd.position + fd.width/2 + margin
           const margin = fd.rightSpace ? fd.rightSpace / 2 : 0.5;
           const p = geometry.getPointAtDistance(fd.position + fd.width / 2 + margin, startX, startY, scale);
           
           ctx.save();
           ctx.translate(p.x, p.y);
           ctx.rotate(p.angle + Math.PI / 2);
           ctx.fillText(fd.rightLabel, 0, 0);
           ctx.restore();
        }
        ctx.restore();
      }

      // Draw count label (horizontal, floating just above)
      if (showLabels) {
        ctx.save();
        ctx.font = '12px system-ui';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        // Draw slightly above the finger dock (screen Y)
        ctx.fillText(`#${index + 1}`, centerX, centerY - widthPx / 2 - 25);
        ctx.restore();
      }
    });
  }

  // Draw planks at regular intervals
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 2;
  for (let d = 0; d <= totalLength; d += 2.5) {
    const point = geometry.getPointAtDistance(d, startX, startY, scale);
    const perpAngle = point.angle + Math.PI / 2;
    const x1 = point.x + Math.cos(perpAngle) * (thickness / 2);
    const y1 = point.y + Math.sin(perpAngle) * (thickness / 2);
    const x2 = point.x - Math.cos(perpAngle) * (thickness / 2);
    const y2 = point.y - Math.sin(perpAngle) * (thickness / 2);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Draw position markers
  if (showLabels && geometry.config.showIntervalLabels !== false) {
    ctx.font = '12px system-ui';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let m = 0; m <= totalLength; m += 25) {
      const point = geometry.getPointAtDistance(m, startX, startY, scale);
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(point.angle);
      ctx.fillText(`${m}m`, 0, 0);
      ctx.restore();
    }
  }
}