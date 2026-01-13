import { Service } from '../Component.mjs';

import GetComponents from './GetComponents.mjs';

/**
 * This service is common for all Gen2+ devices. It handles device management.
 */
export default class Shelly extends Service {
  static GetComponents = GetComponents;
}
