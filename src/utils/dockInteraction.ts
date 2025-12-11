import { DockGeometry, BoatData } from '../types/dock';
import { getFingerDockGeometry, getMooringZoneGeometry } from './dockGeometry';

export interface MooringZone {
  id: string; // Format: "dockId-fingerIndex-side"
  fingerIndex: number;
  side: 'left' | 'right';
  x: number; // World center X
  y: number; // World center Y
  width: number;
  height: number;
  angle: number;
  isOccupied: boolean;
}

export function getAllMooringZones(
  geometry: DockGeometry,
  startX: number,
  startY: number,
  scale: number,
  dockThickness: number,
  boats: BoatData[]
): MooringZone[] {
  const zones: MooringZone[] = [];
  const fingerDocks = geometry.config.fingerDocks || [];

  fingerDocks.forEach((fd, index) => {
    const fdGeom = getFingerDockGeometry(geometry, startX, startY, scale, dockThickness, fd);

    // Left Zone
    if (!fd.hideLeftMooringZone) {
      const zoneGeom = getMooringZoneGeometry(fdGeom, 'left', scale);
      const isOccupied = boats.some(b => 
        b.dockId === geometry.config.id && 
        b.mooringType === 'finger' && 
        b.fingerDockIndex === index && 
        b.mooringSide === 'left'
      );
      
      zones.push({
        id: `${geometry.config.id}-${index}-left`,
        fingerIndex: index,
        side: 'left',
        x: zoneGeom.x,
        y: zoneGeom.y,
        width: zoneGeom.width,
        height: zoneGeom.height,
        angle: zoneGeom.angle,
        isOccupied
      });
    }

    // Right Zone
    if (!fd.hideRightMooringZone) {
      const zoneGeom = getMooringZoneGeometry(fdGeom, 'right', scale);
      const isOccupied = boats.some(b => 
        b.dockId === geometry.config.id && 
        b.mooringType === 'finger' && 
        b.fingerDockIndex === index && 
        b.mooringSide === 'right'
      );
      
      zones.push({
        id: `${geometry.config.id}-${index}-right`,
        fingerIndex: index,
        side: 'right',
        x: zoneGeom.x,
        y: zoneGeom.y,
        width: zoneGeom.width,
        height: zoneGeom.height,
        angle: zoneGeom.angle,
        isOccupied
      });
    }
  });

  return zones;
}

export function hitTestMooringZones(
  mouseX: number,
  mouseY: number,
  zones: MooringZone[]
): MooringZone | null {
  for (const zone of zones) {
    if (zone.isOccupied) continue;

    // Transform mouse to local zone coordinates
    const dx = mouseX - zone.x;
    const dy = mouseY - zone.y;
    
    // Rotate by -angle to align with axes
    const cos = Math.cos(-zone.angle);
    const sin = Math.sin(-zone.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    
    // Check bounds (zone width/height are full dimensions)
    if (Math.abs(localX) <= zone.width / 2 && Math.abs(localY) <= zone.height / 2) {
      return zone;
    }
  }
  return null;
}
