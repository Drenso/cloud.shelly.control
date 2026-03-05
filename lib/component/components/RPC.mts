import { Service } from '../Component.mjs';
import Ping from './RPC/Ping.mjs';

/**
 * This service is undocumented.
 */
export default class RPC extends Service {
  static Ping = Ping;
}
