import ShellyMultiSwitchInputLocalDriver from '../../lib/local/ShellyMultiSwitchInputLocalDriver.js';

export default class ShellyPowerStripGen4LocalDriver extends ShellyMultiSwitchInputLocalDriver {
  protected componentsToSplit: string[] = ['switch'];
}
