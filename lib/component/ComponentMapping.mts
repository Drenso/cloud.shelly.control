import CCT from './components/CCT.mjs';
import Switch from './components/Switch.mjs';
import OutboundWebsocket from './components/OutboundWebsocket.mjs';
import PowerStripUI from './components/PowerStripUI.mjs';
import Temperature from './components/Temperature.mjs';
import Input from './components/Input.mjs';
import System from './components/System.mjs';
import Cover from './components/Cover.mjs';
import Light from './components/Light.mjs';

export const ComponentWithIdMapping = {
  cct: CCT,
  cover: Cover,
  input: Input,
  light: Light,
  switch: Switch,
  temperature: Temperature,
} as const;
export const ComponentWithoutIdMapping = {
  powerstrip_ui: PowerStripUI,
  sys: System,
  ws: OutboundWebsocket,
} as const;

export const ComponentMapping = {
  ...ComponentWithIdMapping,
  ...ComponentWithoutIdMapping,
} as const;

export type MappedComponent = (typeof ComponentMapping)[keyof typeof ComponentMapping];
