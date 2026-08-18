import React, { useRef, useEffect, useState } from 'react';
import { BoatData, DockConfig, YardSlot } from '../types/dock';
import { drawYardScene } from '../utils/yardRenderer';
import {
  calculateYardTransform,
  getBerthMooringBoxRect,
  getPlacedBoatRect,
  getUnplacedBoatRects,
  isBoatCompatibleWithSlot,
  isPointInRect,
} from '../utils/yardLayout';

interface YardCanvasProps {
  boats: BoatData[];
  onPlaceBoat: (id: string, slotNumber: number) => void;
  onSelectBoat: (id: string | null) => void;
  selectedBoatId: string | null;
  dockConfig: DockConfig;
  showLabels?: boolean;
  showTextLabels?: boolean;
}

export function YardCanvas({
  boats,
  onPlaceBoat,
  onSelectBoat,
  selectedBoatId,
  dockConfig,
  showLabels = true,
  showTextLabels = true,
}: YardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredBoatId, setHoveredBoatId] = useState<string | null>(null);

  const yard = dockConfig.yard;

  const toYardCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas || !yard) return null;
    const rect = canvas.getBoundingClientRect();
    const transform = calculateYardTransform(yard, rect.width, rect.height);
    return {
      x: (clientX - rect.left - transform.offsetX) / transform.scale,
      y: (clientY - rect.top - transform.offsetY) / transform.scale,
    };
  };

  const getBoatAtPoint = (x: number, y: number): BoatData | null => {
    if (!yard) return null;
    const unplacedRects = getUnplacedBoatRects(
      yard,
      boats.filter(b => b.slotNumber === undefined)
    );
    // Check in reverse order so the boat drawn last is hit first
    for (let i = boats.length - 1; i >= 0; i--) {
      const boat = boats[i];
      if (boat.slotNumber !== undefined) {
        const slot = yard.slots.find(s => s.number === boat.slotNumber);
        if (slot && isPointInRect(x, y, getPlacedBoatRect(boat, slot))) {
          return boat;
        }
      } else {
        const rect = unplacedRects.get(boat.id);
        if (rect && isPointInRect(x, y, rect)) {
          return boat;
        }
      }
    }
    return null;
  };

  // The dashed mooring box is the click target, as on the other quays
  const getBerthBoxAtPoint = (x: number, y: number): YardSlot | null => {
    if (!yard) return null;
    return yard.slots.find(slot => isPointInRect(x, y, getBerthMooringBoxRect(slot))) ?? null;
  };

  const canPlaceSelectedBoatIn = (slot: YardSlot): boolean => {
    if (!selectedBoatId) return false;
    const selectedBoat = boats.find(b => b.id === selectedBoatId);
    if (!selectedBoat) return false;
    if (slot.number === selectedBoat.slotNumber) return false;

    const isOccupied = boats.some(
      b => b.id !== selectedBoatId && b.slotNumber === slot.number
    );
    if (isOccupied) return false;

    return isBoatCompatibleWithSlot(selectedBoat, slot);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = toYardCoords(e.clientX, e.clientY);
    if (!point) return;

    const boat = getBoatAtPoint(point.x, point.y);
    if (boat) {
      onSelectBoat(boat.id);
      return;
    }

    const slot = getBerthBoxAtPoint(point.x, point.y);
    if (slot) {
      // Keep the selection when the berth cannot take this boat, so the user
      // can simply try another one
      if (selectedBoatId && canPlaceSelectedBoatIn(slot)) {
        onPlaceBoat(selectedBoatId, slot.number);
      }
      return;
    }

    onSelectBoat(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = toYardCoords(e.clientX, e.clientY);
    if (!point) return;

    const boat = getBoatAtPoint(point.x, point.y);
    setHoveredBoatId(boat ? boat.id : null);

    let cursor = 'default';
    if (boat) {
      cursor = 'pointer';
    } else {
      const slot = getBerthBoxAtPoint(point.x, point.y);
      if (slot && canPlaceSelectedBoatIn(slot)) {
        cursor = 'pointer';
      }
    }
    if (canvasRef.current) {
      canvasRef.current.style.cursor = cursor;
    }
  };

  const handleMouseLeave = () => {
    setHoveredBoatId(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !yard) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);
      drawYardScene({
        ctx,
        yard,
        transform: calculateYardTransform(yard, width, height),
        boats,
        canvasWidth: width,
        canvasHeight: height,
        selectedBoatId,
        hoveredBoatId,
        showLabels,
        showTextLabels,
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(resize);
    });
    resizeObserver.observe(container);

    resize();

    return () => resizeObserver.disconnect();
  }, [boats, hoveredBoatId, selectedBoatId, yard, showLabels, showTextLabels]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full"
    />
  );
}
