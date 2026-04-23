import { Service } from '../Component.js';
import Ping from './RPC/Ping.js';

/**
 * This service is undocumented.
 */
export default class RPC extends Service {
  public static readonly Ping = Ping;
}
