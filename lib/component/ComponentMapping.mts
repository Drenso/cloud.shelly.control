import CCT from './components/CCT.mjs';
import Cover from './components/Cover.mjs';
import Illuminance from './components/Illuminance.mjs';
import Input from './components/Input.mjs';
import Light from './components/Light.mjs';
import OutboundWebsocket from './components/OutboundWebsocket.mjs';
import PowerStripUI from './components/PowerStripUI.mjs';
import RGBCCT from './components/RGBCCT.mjs';
import Switch from './components/Switch.mjs';
import System from './components/System.mjs';
import Temperature from './components/Temperature.mjs';
import PresenceZone from './components/PresenceZone.mjs';
import Presence from './components/Presence.mjs';

export const ComponentWithIdMapping = {
  cct: CCT,
  cover: Cover,
  illuminance: Illuminance,
  input: Input,
  light: Light,
  presencezone: PresenceZone,
  rgbcct: RGBCCT,
  switch: Switch,
  temperature: Temperature,
} as const;
export const ComponentWithoutIdMapping = {
  powerstrip_ui: PowerStripUI,
  presence: Presence,
  sys: System,
  ws: OutboundWebsocket,
} as const;

export const ComponentMapping = {
  ...ComponentWithIdMapping,
  ...ComponentWithoutIdMapping,
} as const;

export type MappedComponent = (typeof ComponentMapping)[keyof typeof ComponentMapping];
