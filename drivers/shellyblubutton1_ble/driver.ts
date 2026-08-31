import ShellyBleDriver from '../../lib/ble/BleDriver.js';

export default class ShellyBluButton1BleDriver extends ShellyBleDriver {
  // Same as BLU Button Tough 1, but separate drivers for the different images and icon
  public bleNamePrefixes = ['SBBT-002C'];
}
