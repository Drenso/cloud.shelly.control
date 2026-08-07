import Boolean from './components/Boolean.js';
import Button from './components/Button.js';
import CCT from './components/CCT.js';
import Cover from './components/Cover.js';
import DevicePower from './components/DevicePower.js';
import EM1 from './components/EM1.js';
import EM1Data from './components/EM1Data.js';
import Enum from './components/Enum.js';
import Flood from './components/Flood.js';
import HTUI from './components/HTUI.js';
import Humidity from './components/Humidity.js';
import Illuminance from './components/Illuminance.js';
import Input from './components/Input.js';
import Light from './components/Light.js';
import Number from './components/Number.js';
import Object from './components/Object.js';
import OutboundWebsocket from './components/OutboundWebsocket.js';
import Pill from './components/Pill.js';
import PlugsUI from './components/PlugsUI.js';
import PowerStripUI from './components/PowerStripUI.js';
import Presence from './components/Presence.js';
import PresenceZone from './components/PresenceZone.js';
import RGBCCT from './components/RGBCCT.js';
import Script from './components/Script.js';
import Service from './components/Service.js';
import Switch from './components/Switch.js';
import System from './components/System.js';
import Temperature from './components/Temperature.js';
import Voltmeter from './components/Voltmeter.js';

export const ComponentWithIdMapping = {
  boolean: Boolean,
  button: Button,
  cct: CCT,
  cover: Cover,
  devicepower: DevicePower,
  em1: EM1,
  em1data: EM1Data,
  enum: Enum,
  flood: Flood,
  humidity: Humidity,
  illuminance: Illuminance,
  input: Input,
  light: Light,
  object: Object,
  number: Number,
  presencezone: PresenceZone,
  rgbcct: RGBCCT,
  script: Script,
  service: Service,
  switch: Switch,
  temperature: Temperature,
  voltmeter: Voltmeter,
} as const;
export const ComponentWithoutIdMapping = {
  ht_ui: HTUI,
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
