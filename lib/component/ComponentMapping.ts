import CCT from './components/CCT.js';
import Cover from './components/Cover.js';
import Illuminance from './components/Illuminance.js';
import Input from './components/Input.js';
import Light from './components/Light.js';
import OutboundWebsocket from './components/OutboundWebsocket.js';
import PowerStripUI from './components/PowerStripUI.js';
import RGBCCT from './components/RGBCCT.js';
import Switch from './components/Switch.js';
import System from './components/System.js';
import Temperature from './components/Temperature.js';
import PresenceZone from './components/PresenceZone.js';
import Presence from './components/Presence.js';
import DevicePower from './components/DevicePower.js';
import Flood from './components/Flood.js';

export const ComponentWithIdMapping = {
  cct: CCT,
  cover: Cover,
  devicepower: DevicePower,
  flood: Flood,
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
