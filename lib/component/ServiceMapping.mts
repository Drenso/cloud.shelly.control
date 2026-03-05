import Shelly from './components/Shelly.mjs';
import RPC from './components/RPC.mjs';

export const ServiceMapping = {
  Shelly: Shelly,
  RPC: RPC,
} as const;
