import Shelly from './components/Shelly.mjs';
import Switch from './components/Switch.mjs';

export const ComponentMapping = {
  Shelly: Shelly,
  switch: Switch,
  Switch: Switch,
} as const;
