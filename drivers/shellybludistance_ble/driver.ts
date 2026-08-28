import ShellyBleDriver from '../../lib/ble/BleDriver.js';

export default class ShellyBluDistanceBleDriver extends ShellyBleDriver {
  public bleNamePrefixes = ['SBDI-003E'];
}
