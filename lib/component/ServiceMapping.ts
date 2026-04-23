import Shelly from './components/Shelly.js';
import RPC from './components/RPC.js';

export const ServiceMapping = {
  Shelly: Shelly,
  RPC: RPC,
} as const;
