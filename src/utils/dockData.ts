import { DockConfig } from '../types/dock';
import { DOCK_LENGTH } from './constants';

export const DOCKS: Record<string, DockConfig> = {
  'main-dock': {
    id: 'main-dock',
    name: 'K2',
    type: 'straight-with-curve',
    totalLength: DOCK_LENGTH,
    width: 3,
    straightSectionLength: DOCK_LENGTH / 2,
    curveSectionLength: DOCK_LENGTH / 2,
    curveAngleDegrees: 40,
  },
  'straight-dock': {
    id: 'straight-dock',
    name: 'Fou do',
    type: 'straight',
    totalLength: 207,
    width: 3,
    defaultOrientation: 'flipped',
    restrictedZones: [
      {
        start: 104,
        length: 29.5,
        type: 'private'
      }
    ]
  },
  'afsnee': {
    id: 'afsnee',
    name: 'Afsnee',
    type: 'segmented',
    totalLength: 159.2,
    width: 3,
    showIntervalLabels: false,
    restrictedZones: [
      {
        start: 45.2,
        length: 79.7,
        type: 'private'
      },
      {
        start: 21.4,
        length: 8.4,
        type: 'private'
      }
    ],
    segments: [
      { length: 117.2, angle: 0 },
      { length: 7.7, angle: 30 },
      { length: 15.1, angle: 60 },
      { length: 19.2, angle: 90 }
    ],
    fingerDocks: [
      {
        position: 48.7, // Center of 48.2 - 49.2
        width: 1.0,
        length: 6.0,
        side: 'left',
        leftLabel: '3m',
        rightLabel: '3m',
        leftSpace: 3.0,
        rightSpace: 3.0
      },
      {
        position: 65.7, // Center of 65.2 - 66.2
        width: 1.0,
        length: 7.5,
        side: 'left',
        leftLabel: '3m',
        rightLabel: '3.2m',
        leftSpace: 3.0,
        rightSpace: 3.2
      },
      {
        position: 72.9, // Center of 72.4 - 73.4
        width: 1.0,
        length: 7.5,
        side: 'left',
        leftLabel: '3.2m',
        rightLabel: '3.1m',
        leftSpace: 3.2,
        rightSpace: 3.1
      },
      {
        position: 80.0, // Center of 79.5 - 80.5
        width: 1.0,
        length: 7.5,
        side: 'left',
        leftLabel: '3.1m',
        rightLabel: '2.55m',
        leftSpace: 3.1,
        rightSpace: 2.55
      },
      {
        position: 86.1, // Center of 85.6 - 86.6
        width: 1.0,
        length: 5.1,
        side: 'left',
        hideRightMooringZone: true,
        leftLabel: '2.55m',
        leftSpace: 2.55
      },
      {
        position: 97.1, // Center of 96.6 - 97.6
        width: 1.0,
        length: 5.9,
        side: 'left',
        hideLeftMooringZone: true,
        rightLabel: '2.8m',
        rightSpace: 2.8
      },
      {
        position: 103.7, // Center of 103.2 - 104.2
        width: 1.0,
        length: 6.9,
        side: 'left',
        leftLabel: '2.8m',
        rightLabel: '2.8m',
        leftSpace: 2.8,
        rightSpace: 2.8
      },
      {
        position: 110.3, // Center of 109.8 - 110.8
        width: 1.0,
        length: 6.7,
        side: 'left',
        leftLabel: '2.8m',
        rightLabel: '2.7m',
        leftSpace: 2.8,
        rightSpace: 2.7
      },
      {
        position: 116.7, // Center of 116.2 - 117.2
        width: 1.0,
        length: 8.0,
        side: 'left',
        leftLabel: '2.7m',
        rightLabel: '3.35m',
        leftSpace: 2.7,
        rightSpace: 3.35
      },
      {
        position: 123.4,
        width: 1.0,
        length: 8.5,
        side: 'left',
        leftLabel: '3.35m',
        rightLabel: '2.6m',
        leftSpace: 3.35,
        rightSpace: 2.6
      }
    ]
  }
};
