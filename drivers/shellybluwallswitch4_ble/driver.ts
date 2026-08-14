import ShellyBleDriver from '../../lib/ble/BleDriver.js';

export default class ShellyBluWallSwitch4BleDriver extends ShellyBleDriver {
  public bleNamePrefixes = ['SBBT-004CEU', 'SBBT-EU'];
}
