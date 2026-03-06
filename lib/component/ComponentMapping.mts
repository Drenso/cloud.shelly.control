import Switch from './components/Switch.mjs';
import OutboundWebsocket from './components/OutboundWebsocket.mjs';
import PowerStripUI from './components/PowerStripUI.mjs';
import Temperature from './components/Temperature.mjs';

export const ComponentWithIdMapping = { switch: Switch, temperature: Temperature } as const;
export const ComponentWithoutIdMapping = { ws: OutboundWebsocket, powerstrip_ui: PowerStripUI } as const;

export const ComponentMapping = {
  ...ComponentWithIdMapping,
  ...ComponentWithoutIdMapping,
} as const;

export type MappedComponent = (typeof ComponentMapping)[keyof typeof ComponentMapping];
