import React, { useRef, useEffect, useMemo } from 'react';
import { BoatData, DockConfig } from '../types/dock';
import { createDockGeometry } from '../utils/dockGeometry';
import { drawDock, drawScene } from '../utils/dockRenderer';
import { drawBoat, drawDistanceGuides } from '../utils/boatRenderer';
import { BOAT_DOCK_GAP } from '../utils/constants';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { calculateCanvasDimensions } from '../utils/canvasLayout';

interface DockCanvasProps {
  boats: BoatData[];
  onMoveBoat: (id: string, newPosition: number) => void;
  onMoorBoat?: (id: string, fingerIndex: number, side: 'left' | 'right') => void;
  onSelectBoat: (id: string | null) => void;
  selectedBoatId: string | null;
  dockConfig: DockConfig;
  showLabels?: boolean;
  showTextLabels?: boolean;
}

export function DockCanvas({ boats, onMoveBoat, onMoorBoat, onSelectBoat, selectedBoatId, dockConfig, showLabels = true, showTextLabels = true }: DockCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Create dock geometry based on current config
  const dockGeometry = useMemo(() => createDockGeometry(dockConfig), [dockConfig]);

  const {
    draggedBoat,
    hoveredBoat,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  } = useCanvasInteraction({
    canvasRef,
    boats,
    onMoveBoat,
    onMoorBoat,
    onSelectBoat,
    selectedBoatId, // Pass selectedBoatId to hook
    dockGeometry,
    dockConfig
  });

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    const { dockStartX, dockStartY, dockScale, dockThickness } =
      calculateCanvasDimensions(dockGeometry, dockConfig, width, height);

    // Draw background scene (water and land)
    drawScene({
      ctx,
      geometry: dockGeometry,
      startX: dockStartX,
      startY: dockStartY,
      scale: dockScale,
      thickness: dockThickness,
      canvasWidth: width,
      canvasHeight: height,
    });

    // Draw dock
    drawDock({
      ctx,
      geometry: dockGeometry,
      startX: dockStartX,
      startY: dockStartY,
      scale: dockScale,
      thickness: dockThickness,
      showLabels,
      boats, // Pass boats here
    });

    // Draw boats
    boats.forEach((boat) => {
      // Check if boat is in a restricted zone
      let isRestricted = false;
      // Moored boats are exempt from restriction checks
      if (dockConfig.restrictedZones && boat.mooringType !== 'finger') {
        const boatStart = boat.position;
        const boatEnd = boat.position + boat.length;
        
        isRestricted = dockConfig.restrictedZones.some(zone => {
          // Skip clickable zones (boats parked there should not be greyed out)
          if (zone.type === 'clickable') return false;
          
          const zoneEnd = zone.start + zone.length;
          // Check for overlap: boatStart < zoneEnd && boatEnd > zoneStart
          return boatStart < zoneEnd && boatEnd > zone.start;
        });
      }

      drawBoat({
        ctx,
        boat,
        geometry: dockGeometry,
        startX: dockStartX,
        startY: dockStartY,
        scale: dockScale,
        dockThickness,
        dockGap: BOAT_DOCK_GAP,
        isHovered: hoveredBoat === boat.id,
        isDragged: draggedBoat === boat.id,
        isSelected: selectedBoatId === boat.id,
        isRestricted,
        showTextLabel: showTextLabels,
      });
    });

    // Draw distance guides
    if (showLabels) {
      drawDistanceGuides(ctx, boats, dockGeometry, dockStartX, dockStartY, dockScale, dockThickness, BOAT_DOCK_GAP);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use ResizeObserver to handle container resizing (e.g. sidebar toggle)
    const container = canvas.parentElement;
    if (!container) return;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      // Reset transform before scaling to avoid accumulating scales
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      
      draw(ctx, width, height);
    };

    const resizeObserver = new ResizeObserver(() => {
      // Request animation frame to avoid "ResizeObserver loop limit exceeded"
      requestAnimationFrame(resize);
    });
    
    resizeObserver.observe(container);

    // Initial size
    resize();

    return () => resizeObserver.disconnect();
  }, [boats, hoveredBoat, draggedBoat, selectedBoatId, dockConfig, dockGeometry, showLabels, showTextLabels]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full"
    />
  );
}
