import type { ButtonEventType } from './flow/buttonFlows.js';

export interface ButtonCountDeviceInterface {
  getButtonCount(): number;
}

export interface ButtonEventTypesDeviceInterface {
  getButtonEventTypes(): ButtonEventType[];
}

export interface MultiZoneCapabilityDeviceInterface {
  isZoneOccupied(zone: number): boolean;
}
