import ShellyBleDriver from '../../lib/ble/BleDriver.js';

export default class EcowittWS90BleDriver extends ShellyBleDriver {
  public bleNamePrefixes = ['SBWS-90CM'];
}
