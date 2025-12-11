export const DOCK_LENGTH = 152; // meters (76m straight + 76m curved)
export const MAX_BOAT_WIDTH = 10; // meters
export const MIN_BOAT_LENGTH = 1; // meters
export const MIN_BOAT_WIDTH = 1; // meters
export const DEFAULT_BOAT_LENGTH = 7; // meters
export const DEFAULT_BOAT_WIDTH = 3; // meters
export const POSITION_THRESHOLD = 0.01; // meters - for comparing if boats are at same position
export const GRID_SNAP_SIZE = 0.5;
export const BOAT_DOCK_GAP = 2;

export const isValidLength = (value: string): boolean => {
  const num = Number(value);
  return value !== '' && !isNaN(num) && num >= MIN_BOAT_LENGTH && num <= DOCK_LENGTH;
};

export const isValidWidth = (value: string): boolean => {
  const num = Number(value);
  return value !== '' && !isNaN(num) && num >= MIN_BOAT_WIDTH && num <= MAX_BOAT_WIDTH;
};
