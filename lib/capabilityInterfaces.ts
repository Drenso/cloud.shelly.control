import type { ButtonEventType } from './ble/BTHomePropertyHandlers.js';

export interface ButtonCountDeviceInterface {
  getButtonCount(): number;
}

export interface ButtonEventTypesDeviceInterface {
  getButtonEventTypes(): ButtonEventType[];
}

export interface MultiZoneCapabilityDeviceInterface {
  isZoneOccupied(zone: number): boolean;
}
