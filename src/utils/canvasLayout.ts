import { DockConfig, DockDimensions, DockGeometry } from '../types/dock';
import { calculateDockScale } from './dockGeometry';

// Constants for layout
const DOCK_Y_OFFSET = 100;

export function calculateCanvasDimensions(
  geometry: DockGeometry,
  dockConfig: DockConfig,
  width: number,
  height: number
): DockDimensions {
  let widthRatio = 0.9;
  // Reduce scale for Afsnee to allow more margin
  if (dockConfig.id === 'afsnee') {
    widthRatio = 0.8;
  }
  
  const dockScale = calculateDockScale(geometry, width, widthRatio);
  const dockThickness = dockConfig.width * dockScale;

  // Calculate vertical extent
  const verticalExtent = geometry.calculateVerticalExtent(dockScale);

  // Position dock lower to show 70% water, 30% land
  let dockStartY = height * 0.65;
  
  // Special adjustment for Afsnee dock which extends significantly downwards
  if (dockConfig.id === 'afsnee') {
    // Move up by 10% as requested (0.65 -> 0.55)
    dockStartY = height * 0.55;
  }
  
  const waterHeight = dockStartY + DOCK_Y_OFFSET + verticalExtent + dockThickness / 2;

  // Calculate horizontal positioning
  const horizontalExtent = geometry.calculateHorizontalExtent(dockScale);
  const dockStartX = (width - horizontalExtent) / 2;

  return { waterHeight, dockStartX, dockStartY, dockScale, dockThickness };
}
