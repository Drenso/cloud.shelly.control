import GetComponents from './GetComponents.mjs';
import type { Component } from '../Component.mjs';

/**
 * This service is common for all Gen2+ devices. It handles device management.
 */
export default class Shelly implements Component {
  static GetComponents = GetComponents;
}
