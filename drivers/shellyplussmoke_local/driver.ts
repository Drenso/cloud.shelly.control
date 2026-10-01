import ShellyLocalDriver from '../../lib/local/LocalDriver.js';

export default class ShellyPlusSmokeLocalDriver extends ShellyLocalDriver {
  public readonly batteryDevice = true;
}
