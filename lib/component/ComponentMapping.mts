import Switch from './components/Switch.mjs';
import OutboundWebsocket from './components/OutboundWebsocket.mjs';

export const ComponentWithIdMapping = { switch: Switch } as const;
export const ComponentWithoutIdMapping = { ws: OutboundWebsocket } as const;

export const ComponentMapping = {
  ...ComponentWithIdMapping,
  ...ComponentWithoutIdMapping,
} as const;

export type MappedComponent = (typeof ComponentMapping)[keyof typeof ComponentMapping];
