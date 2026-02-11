import { useState, RefObject } from 'react';
import { BoatData, DockConfig, DockGeometry } from '../types/dock';
import { calculateCanvasDimensions } from '../utils/canvasLayout';
import { getClosestPointOnDock, getFingerDockGeometry, getMooringZoneGeometry } from '../utils/dockGeometry';
import { getAllMooringZones, hitTestMooringZones } from '../utils/dockInteraction';
import { GRID_SNAP_SIZE, BOAT_DOCK_GAP } from '../utils/constants';

interface UseCanvasInteractionProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  boats: BoatData[];
  onMoveBoat: (id: string, newPosition: number) => void;
  onMoorBoat?: (id: string, fingerIndex: number, side: 'left' | 'right') => void;
  onSelectBoat: (id: string | null) => void;
  selectedBoatId: string | null;
  dockGeometry: DockGeometry;
  dockConfig: DockConfig;
}

export function useCanvasInteraction({
  canvasRef,
  boats,
  onMoveBoat,
  onMoorBoat,
  onSelectBoat,
  selectedBoatId,
  dockGeometry,
  dockConfig,
}: UseCanvasInteractionProps) {
  const [draggedBoat, setDraggedBoat] = useState<string | null>(null);
  const [hoveredBoat, setHoveredBoat] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [initialBoatPosition, setInitialBoatPosition] = useState<number | null>(null);

  const getBoatAtPosition = (x: number, y: number): BoatData | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const { dockStartX, dockStartY, dockScale, dockThickness } = calculateCanvasDimensions(
      dockGeometry,
      dockConfig,
      rect.width,
      rect.height
    );

    // Check boats in reverse order (top to bottom)
    for (let i = boats.length - 1; i >= 0; i--) {
      const boat = boats[i];
      const boatLengthPx = boat.length * dockScale;
      const boatWidthPx = boat.width * dockScale;

      let localX: number, localY: number;
      let adjustedLocalY: number;

      // Check if boat is moored to a finger dock zone
      if (boat.mooringType === 'finger' && 
          boat.fingerDockIndex !== undefined && 
          boat.mooringSide && 
          dockGeometry.config.fingerDocks && 
          dockGeometry.config.fingerDocks[boat.fingerDockIndex]) {
        
        const fd = dockGeometry.config.fingerDocks[boat.fingerDockIndex];
        const fdGeom = getFingerDockGeometry(dockGeometry, dockStartX, dockStartY, dockScale, dockThickness, fd);
        const zoneGeom = getMooringZoneGeometry(fdGeom, boat.mooringSide, dockScale);
        
        const centerX = zoneGeom.x;
        const centerY = zoneGeom.y;
        const angle = -Math.PI / 2; // Match the rotation in drawBoat

        const dx = x - centerX;
        const dy = y - centerY;
        
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        
        localX = dx * cos - dy * sin;
        localY = dx * sin + dy * cos;
        adjustedLocalY = localY; // No perpOffset for moored boats
      } else {
        // Main dock logic
        const boatCenter = boat.position + boat.length / 2;
        const centerPoint = dockGeometry.getPointAtDistance(boatCenter, dockStartX, dockStartY, dockScale);

        // Transform click point to boat's local coordinate system
        const dx = x - centerPoint.x;
        const dy = y - centerPoint.y;

        // Rotate by -angle to align with boat's coordinate system
        const cos = Math.cos(-centerPoint.angle);
        const sin = Math.sin(-centerPoint.angle);
        localX = dx * cos - dy * sin;
        localY = dx * sin + dy * cos;

        // Account for perpendicular offset
        const perpOffset = -(dockThickness / 2 + BOAT_DOCK_GAP + boatWidthPx / 2);
        adjustedLocalY = localY - perpOffset;
      }

      // Check if point is within boat bounds
      if (Math.abs(localX) <= boatLengthPx / 2 && Math.abs(adjustedLocalY) <= boatWidthPx / 2) {
        return boat;
      }
    }

    return null;
  };

  const getDistanceAtPoint = (x: number, y: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const { dockStartX, dockStartY, dockScale } = calculateCanvasDimensions(
        dockGeometry,
        dockConfig,
        rect.width, 
        rect.height
    );

    // Find closest point on dock using helper
    const result = getClosestPointOnDock(x, y, dockGeometry, dockStartX, dockStartY, dockScale);
    
    // Only return if reasonably close to dock
    return result.distanceToPoint < 150 ? result.distance : null;
  };

  const isClickableZoneOccupied = (zoneStart: number, zoneEnd: number): boolean => {
    return boats.some(boat => {
      const boatCenter = boat.position + boat.length / 2;
      return boatCenter >= zoneStart && boatCenter <= zoneEnd;
    });
  };

  const getClickableZoneAtPosition = (x: number, y: number): { start: number; end: number } | null => {
    if (!dockConfig.restrictedZones) return null;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const { dockStartX, dockStartY, dockScale, dockThickness } = calculateCanvasDimensions(
      dockGeometry,
      dockConfig,
      rect.width,
      rect.height
    );

    // Find clickable restricted zone and check if click is within the box
    for (const zone of dockConfig.restrictedZones) {
      if (zone.type === 'clickable') {
        const zoneCenter = zone.start + zone.length / 2;
        const zonePoint = dockGeometry.getPointAtDistance(zoneCenter, dockStartX, dockStartY, dockScale);
        
        const boxWidth = zone.length * dockScale;
        const boxHeight = 2 * dockScale;
        const boxGap = 4; // Fixed gap in pixels (same as finger docks)
        const perpOffset = -(dockThickness / 2 + boxGap + boxHeight / 2);
        
        // Calculate box center in world coordinates (matching the rendering code)
        // Rendering: translate to zonePoint, rotate by angle, then translate by (0, perpOffset)
        // This gives: worldX = zonePoint.x + 0 * cos(angle) - perpOffset * sin(angle)
        //             worldY = zonePoint.y + 0 * sin(angle) + perpOffset * cos(angle)
        const boxCenterX = zonePoint.x - perpOffset * Math.sin(zonePoint.angle);
        const boxCenterY = zonePoint.y + perpOffset * Math.cos(zonePoint.angle);
        
        // Transform mouse to box coordinates
        const dx = x - boxCenterX;
        const dy = y - boxCenterY;
        
        const cos = Math.cos(-zonePoint.angle);
        const sin = Math.sin(-zonePoint.angle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        
        // Check if click is within the box
        if (Math.abs(localX) <= boxWidth / 2 && Math.abs(localY) <= boxHeight / 2) {
          return { start: zone.start, end: zone.start + zone.length };
        }
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const boat = getBoatAtPosition(x, y);
    if (boat) {
      onSelectBoat(boat.id);
      
      // Check if boat is in a clickable restricted zone (cannot drag)
      const boatCenter = boat.position + boat.length / 2;
      let isInClickableZone = false;
      if (dockConfig.restrictedZones) {
        isInClickableZone = dockConfig.restrictedZones.some(zone => {
          if (zone.type === 'clickable') {
            const zoneEnd = zone.start + zone.length;
            return boatCenter >= zone.start && boatCenter <= zoneEnd;
          }
          return false;
        });
      }
      
      // Only allow dragging if the boat is NOT moored to a finger dock AND NOT in a clickable zone
      if (boat.mooringType !== 'finger' && !isInClickableZone) {
        setDraggedBoat(boat.id);
        setInitialBoatPosition(boat.position);
        
        // Calculate offset between mouse position on dock and boat start position
        const mouseDockPosition = getDistanceAtPoint(x, y);
        if (mouseDockPosition !== null) {
          setDragOffset(mouseDockPosition - boat.position);
        } else {
          setDragOffset(0);
        }
      }
    } else {
      onSelectBoat(null);

      // Check for click on mooring zones
      const { dockStartX, dockStartY, dockScale, dockThickness } = calculateCanvasDimensions(
        dockGeometry,
        dockConfig,
        rect.width,
        rect.height
      );

      const zones = getAllMooringZones(dockGeometry, dockStartX, dockStartY, dockScale, dockThickness, boats);
      const hitZone = hitTestMooringZones(x, y, zones);
      
      if (hitZone) {
        console.log('Clicked mooring zone:', hitZone);
        if (selectedBoatId && onMoorBoat) {
          const selectedBoat = boats.find(b => b.id === selectedBoatId);
          const fingerDock = dockConfig.fingerDocks?.[hitZone.fingerIndex];

          if (selectedBoat && fingerDock) {
            // Check if boat fits on finger dock (length)
            if (selectedBoat.length > fingerDock.length) {
              return;
            }

            // Check if boat fits in mooring zone (width)
            // Mooring zones limit is defined by the space available (leftSpace/rightSpace)
            const spaceLimit = hitZone.side === 'left' ? fingerDock.leftSpace : fingerDock.rightSpace;
            if (spaceLimit !== undefined && selectedBoat.width > spaceLimit) {
              return;
            }

            onMoorBoat(selectedBoatId, hitZone.fingerIndex, hitZone.side);
          }
        }
      } else {
        // Check for click on clickable restricted zones
        const clickableZone = getClickableZoneAtPosition(x, y);
        if (clickableZone && selectedBoatId) {
          const selectedBoat = boats.find(b => b.id === selectedBoatId);
          if (selectedBoat) {
            // Check if zone is occupied
            if (isClickableZoneOccupied(clickableZone.start, clickableZone.end)) {
              return;
            }

            // Check if boat fits (max 6m length)
            const zoneLength = clickableZone.end - clickableZone.start;
            if (selectedBoat.length > zoneLength) {
              return;
            }

            // Park boat centered in zone
            const zoneCenter = (clickableZone.start + clickableZone.end) / 2;
            const newPosition = zoneCenter - selectedBoat.length / 2;
            
            onMoveBoat(selectedBoatId, newPosition);
          }
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggedBoat) {
      const mouseDockPosition = getDistanceAtPoint(x, y);
      if (mouseDockPosition !== null) {
        // Apply offset to maintain relative position
        const targetPosition = mouseDockPosition - dragOffset;
        
        // Snap to grid
        const snappedPosition = Math.round(targetPosition / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;
        onMoveBoat(draggedBoat, snappedPosition);
      }
    } else {
      const boat = getBoatAtPosition(x, y);
      setHoveredBoat(boat ? boat.id : null);

      let cursor = boat ? 'pointer' : 'default';

      if (!boat) {
        // Check mooring zones for cursor
        const { dockStartX, dockStartY, dockScale, dockThickness } = calculateCanvasDimensions(
          dockGeometry,
          dockConfig,
          rect.width,
          rect.height
        );

        const zones = getAllMooringZones(dockGeometry, dockStartX, dockStartY, dockScale, dockThickness, boats);
        const hitZone = hitTestMooringZones(x, y, zones);
        
        if (hitZone) {
          cursor = 'pointer';
        } else {
          // Check clickable restricted zones for cursor (only if not occupied)
          const clickableZone = getClickableZoneAtPosition(x, y);
          if (clickableZone) {
            // Check if zone is occupied
            if (!isClickableZoneOccupied(clickableZone.start, clickableZone.end)) {
              cursor = 'pointer';
            }
          }
        }
      }

      if (canvasRef.current) {
        canvasRef.current.style.cursor = cursor;
      }
    }
  };

  const handleMouseUp = () => {
    if (draggedBoat && initialBoatPosition !== null && dockConfig.restrictedZones) {
      const boat = boats.find(b => b.id === draggedBoat);
      if (boat) {
        const boatStart = boat.position;
        const boatEnd = boat.position + boat.length;
        
        const isRestricted = dockConfig.restrictedZones.some(zone => {
          const zoneEnd = zone.start + zone.length;
          return boatStart < zoneEnd && boatEnd > zone.start;
        });

        if (isRestricted) {
          // Revert to initial position
          onMoveBoat(draggedBoat, initialBoatPosition);
        }
      }
    }

    setDraggedBoat(null);
    setDragOffset(0);
    setInitialBoatPosition(null);
  };

  const handleMouseLeave = () => {
    setDraggedBoat(null);
    setHoveredBoat(null);
    setDragOffset(0);
    setInitialBoatPosition(null);
  };

  return {
    draggedBoat,
    hoveredBoat,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  };
}
