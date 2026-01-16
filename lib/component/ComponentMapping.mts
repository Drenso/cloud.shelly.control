import Shelly from './components/Shelly.mjs';
import SwitchInstance from './components/Switch.mjs';

export const ComponentMapping = {
  Switch: SwitchInstance,
} as const;

export const ServiceMapping = {
  Shelly: Shelly,
} as const;
