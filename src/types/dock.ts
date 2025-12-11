// Dock type definitions

export interface BoatData {
  id: string;
  dockId: string;
  name: string;
  length: number;
  width: number;
  position: number;
  number: number;
  // Mooring state
  mooringType?: 'main' | 'finger';
  fingerDockIndex?: number;
  mooringSide?: 'left' | 'right';
}

export interface PointAndAngle {
  x: number;
  y: number;
  angle: number; // in radians, direction the dock is facing
}

export interface DockDimensions {
  waterHeight: number;
  dockStartX: number;
  dockStartY: number;
  dockScale: number;
  dockThickness: number;
}

export type DockType = 'straight-with-curve' | 'straight' | 'segmented';

export interface DockConfig {
  id: string;
  name: string;
  type: DockType;
  totalLength: number;
  width: number; // meters
  defaultOrientation?: 'standard' | 'flipped'; // Orientation of boats relative to dock
  // For curved docks
  straightSectionLength?: number;
  curveSectionLength?: number;
  curveAngleDegrees?: number;
  // For segmented docks
  segments?: {
    length: number;
    angle: number; // degrees
  }[];
  // For finger docks (future feature)
  fingerDocks?: {
    position: number; // Distance along main dock
    side: 'left' | 'right';
    length: number;
    width: number;
    leftLabel?: string;
    rightLabel?: string;
    leftSpace?: number;
    rightSpace?: number;
    hideLeftMooringZone?: boolean;
    hideRightMooringZone?: boolean;
  }[];
  showIntervalLabels?: boolean;
  restrictedZones?: {
    start: number;
    length: number;
    type: string;
  }[];
}

export interface DockGeometry {
  config: DockConfig;
  getPointAtDistance: (distance: number, startX: number, startY: number, scale: number) => PointAndAngle;
  calculateHorizontalExtent: (scale: number) => number;
  calculateVerticalExtent: (scale: number) => number;
}
