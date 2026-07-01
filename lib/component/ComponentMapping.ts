import CCT from './components/CCT.js';
import Cover from './components/Cover.js';
import EM1 from './components/EM1.js';
import EM1Data from './components/EM1Data.js';
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
import Pill from './components/Pill.js';
import Voltmeter from './components/Voltmeter.js';
import Humidity from './components/Humidity.js';
import PlugsUI from './components/PlugsUI.js';

export const ComponentWithIdMapping = {
  cct: CCT,
  cover: Cover,
  devicepower: DevicePower,
  em1: EM1,
  em1data: EM1Data,
  flood: Flood,
  humidity: Humidity,
  illuminance: Illuminance,
  input: Input,
  light: Light,
  presencezone: PresenceZone,
  rgbcct: RGBCCT,
  switch: Switch,
  temperature: Temperature,
  voltmeter: Voltmeter,
} as const;
export const ComponentWithoutIdMapping = {
  pill: Pill,
  plugs_ui: PlugsUI,
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
