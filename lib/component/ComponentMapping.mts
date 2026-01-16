import Shelly from './components/Shelly.mjs';
import Switch from './components/Switch.mjs';

export const ComponentMapping = {
  Switch: Switch,
} as const;

export const ServiceMapping = {
  Shelly: Shelly,
} as const;
