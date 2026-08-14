import ShellyBleDriver from '../../lib/ble/BleDriver.js';

export default class ShellyBluWallSwitchZBBleDriver extends ShellyBleDriver {
  public bleNamePrefixes = ['SBBT-104C'];
}
