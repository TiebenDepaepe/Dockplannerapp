// Dock geometry calculations

import { DockConfig, DockGeometry, PointAndAngle } from '../types/dock';

// Create geometry calculator for straight dock
export function createStraightGeometry(config: DockConfig): DockGeometry {
  const totalLength = config.totalLength;

  const getPointAtDistance = (
    distance: number,
    startX: number,
    startY: number,
    scale: number
  ): PointAndAngle => {
    return {
      x: startX + distance * scale,
      y: startY,
      angle: 0, // Always horizontal
    };
  };

  const calculateHorizontalExtent = (scale: number): number => {
    return totalLength * scale;
  };

  const calculateVerticalExtent = (scale: number): number => {
    return 0; // Straight line has no vertical extent
  };

  return {
    config,
    getPointAtDistance,
    calculateHorizontalExtent,
    calculateVerticalExtent,
  };
}

// Create geometry calculator for straight dock with curve
export function createStraightWithCurveGeometry(config: DockConfig): DockGeometry {
  const straightLength = config.straightSectionLength || 0;
  const curveLength = config.curveSectionLength || 0;
  const curveAngleDegrees = config.curveAngleDegrees || 0;
  const curveAngleRadians = (curveAngleDegrees * Math.PI) / 180;
  
  // Calculate radius from arc length: s = r * θ, so r = s / θ
  const curveRadius = curveAngleRadians > 0 ? curveLength / curveAngleRadians : 0;

  const getPointAtDistance = (
    distance: number,
    startX: number,
    startY: number,
    scale: number
  ): PointAndAngle => {
    if (distance <= straightLength) {
      // On the straight section
      return {
        x: startX + distance * scale,
        y: startY,
        angle: 0, // horizontal
      };
    } else {
      // On the curved section
      const distanceAlongCurve = distance - straightLength;
      const angleFromCurveStart = distanceAlongCurve / curveRadius;

      // The center of the circle is BELOW the start of the curve
      const curveStartX = startX + straightLength * scale;
      const curveStartY = startY;
      const centerX = curveStartX;
      const centerY = curveStartY + curveRadius * scale;

      // Position on the arc
      const angleFromCenter = -Math.PI / 2 + angleFromCurveStart;

      const x = centerX + curveRadius * scale * Math.cos(angleFromCenter);
      const y = centerY + curveRadius * scale * Math.sin(angleFromCenter);

      // The dock direction (tangent) is perpendicular to the radius
      const tangentAngle = angleFromCenter + Math.PI / 2;

      return { x, y, angle: tangentAngle };
    }
  };

  const calculateHorizontalExtent = (scale: number): number => {
    const straightHorizontal = straightLength;
    const curveHorizontal = curveRadius * Math.sin(curveAngleRadians);
    return (straightHorizontal + curveHorizontal) * scale;
  };

  const calculateVerticalExtent = (scale: number): number => {
    // Vertical drop = radius * (1 - cos(angle))
    return curveRadius * scale * (1 - Math.cos(curveAngleRadians));
  };

  return {
    config,
    getPointAtDistance,
    calculateHorizontalExtent,
    calculateVerticalExtent,
  };
}

// Create geometry calculator for segmented dock (sharp corners)
export function createSegmentedGeometry(config: DockConfig): DockGeometry {
  const segments = config.segments || [];
  
  // Pre-calculate segment start positions (normalized to scale=1, start=(0,0))
  // We store relative coordinates
  const segmentStarts: { x: number; y: number; dist: number }[] = [];
  let currentX = 0;
  let currentY = 0;
  let currentDist = 0;

  segments.forEach(seg => {
    segmentStarts.push({ x: currentX, y: currentY, dist: currentDist });
    const angleRad = (seg.angle * Math.PI) / 180;
    currentX += seg.length * Math.cos(angleRad);
    currentY += seg.length * Math.sin(angleRad);
    currentDist += seg.length;
  });

  // Calculate extents based on all segment endpoints
  let maxX = 0;
  let maxY = 0;
  let checkX = 0;
  let checkY = 0;
  
  segments.forEach(seg => {
    const angleRad = (seg.angle * Math.PI) / 180;
    checkX += seg.length * Math.cos(angleRad);
    checkY += seg.length * Math.sin(angleRad);
    maxX = Math.max(maxX, checkX);
    maxY = Math.max(maxY, checkY);
  });

  const getPointAtDistance = (
    distance: number,
    startX: number,
    startY: number,
    scale: number
  ): PointAndAngle => {
    // Find which segment we are in
    let segmentIndex = segments.length - 1;
    for (let i = 0; i < segments.length; i++) {
      if (distance < segmentStarts[i].dist + segments[i].length) {
        segmentIndex = i;
        break;
      }
    }

    // If somehow out of bounds (shouldn't happen with clamped distance), cap at last segment
    if (segmentIndex < 0) segmentIndex = 0;
    
    const segment = segments[segmentIndex];
    const segStart = segmentStarts[segmentIndex];
    
    // Distance into this segment
    // Clamp distance to segment length to avoid overshooting if distance > totalLength
    const distInSegment = Math.min(
      Math.max(0, distance - segStart.dist),
      segment.length
    );

    const angleRad = (segment.angle * Math.PI) / 180;
    
    // Calculate relative position
    const relX = segStart.x + distInSegment * Math.cos(angleRad);
    const relY = segStart.y + distInSegment * Math.sin(angleRad);

    return {
      x: startX + relX * scale,
      y: startY + relY * scale,
      angle: angleRad
    };
  };

  const calculateHorizontalExtent = (scale: number): number => {
    return maxX * scale;
  };

  const calculateVerticalExtent = (scale: number): number => {
    return maxY * scale;
  };

  return {
    config,
    getPointAtDistance,
    calculateHorizontalExtent,
    calculateVerticalExtent,
  };
}

// Factory function to create geometry based on dock type
export function createDockGeometry(config: DockConfig): DockGeometry {
  switch (config.type) {
    case 'straight-with-curve':
      return createStraightWithCurveGeometry(config);
    case 'straight':
      return createStraightGeometry(config);
    case 'segmented':
      return createSegmentedGeometry(config);
    default:
      throw new Error(`Unknown dock type: ${config.type}`);
  }
}

// Calculate scale to fit dock in available width
export function calculateDockScale(
  geometry: DockGeometry,
  canvasWidth: number,
  widthRatio: number = 0.9
): number {
  const availableWidth = canvasWidth * widthRatio;
  const horizontalExtentMeters =
    geometry.calculateHorizontalExtent(1) / 1; // Calculate at scale 1, then divide
  return availableWidth / horizontalExtentMeters;
}

// Helper to find the closest point on the dock for a given screen coordinate
export function getClosestPointOnDock(
  x: number,
  y: number,
  geometry: DockGeometry,
  startX: number,
  startY: number,
  scale: number,
  step: number = 0.1
): { distance: number; distanceToPoint: number } {
  let minDist = Infinity;
  let closestDistance = 0;
  const totalLength = geometry.config.totalLength;

  for (let d = 0; d <= totalLength; d += step) {
    const point = geometry.getPointAtDistance(d, startX, startY, scale);
    const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
    if (dist < minDist) {
      minDist = dist;
      closestDistance = d;
    }
  }

  return { distance: closestDistance, distanceToPoint: minDist };
}

// Helper to sample points along the dock path
export function getDockPathSamples(
  geometry: DockGeometry,
  startX: number,
  startY: number,
  scale: number,
  samples: number = 200
): PointAndAngle[] {
  const points: PointAndAngle[] = [];
  const totalLength = geometry.config.totalLength;
  for (let i = 0; i <= samples; i++) {
    const distance = (i / samples) * totalLength;
    points.push(geometry.getPointAtDistance(distance, startX, startY, scale));
  }
  return points;
}

export interface FingerDockGeometry {
  x: number;
  y: number;
  angle: number;
  width: number;
  length: number;
  config: any;
}

export function getFingerDockGeometry(
  dockGeometry: DockGeometry,
  startX: number,
  startY: number,
  scale: number,
  dockThickness: number,
  fingerDockConfig: any
): FingerDockGeometry {
  const point = dockGeometry.getPointAtDistance(fingerDockConfig.position, startX, startY, scale);
  const sideDir = fingerDockConfig.side === 'right' ? 1 : -1;
  const dockNormal = point.angle + (Math.PI / 2) * sideDir;
  
  const edgeX = point.x + Math.cos(dockNormal) * (dockThickness / 2);
  const edgeY = point.y + Math.sin(dockNormal) * (dockThickness / 2);
  
  return {
    x: edgeX,
    y: edgeY,
    angle: dockNormal,
    width: fingerDockConfig.width * scale,
    length: fingerDockConfig.length * scale,
    config: fingerDockConfig
  };
}

export function getMooringZoneGeometry(
  fdGeom: FingerDockGeometry,
  side: 'left' | 'right',
  scale: number
): { x: number, y: number, width: number, height: number, angle: number } {
  const boxSize = 2 * scale;
  const boxGap = 4; // Margin from dock in pixels
  
  // Center X relative to finger dock start (along the finger dock)
  const centerXLocal = fdGeom.length / 2;
  
  // Center Y relative to finger dock center (perpendicular)
  let centerYLocal = 0;
  
  if (side === 'left') {
    // Left side is negative Y in local coords (perpendicular to direction)
    centerYLocal = -fdGeom.width / 2 - boxSize / 2 - boxGap;
  } else {
    // Right side is positive Y
    centerYLocal = fdGeom.width / 2 + boxSize / 2 + boxGap;
  }
  
  // Transform local center to world
  const cos = Math.cos(fdGeom.angle);
  const sin = Math.sin(fdGeom.angle);
  
  const worldX = fdGeom.x + centerXLocal * cos - centerYLocal * sin;
  const worldY = fdGeom.y + centerXLocal * sin + centerYLocal * cos;
  
  return {
    x: worldX,
    y: worldY,
    width: boxSize,
    height: boxSize,
    angle: fdGeom.angle
  };
}
