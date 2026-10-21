import ShellyZWaveDevice from '../../lib/zwave/ZWaveDevice.js';

export default class ShellyWave1ZWaveDevice extends ShellyZWaveDevice {
  protected async configureDevice(): Promise<void> {
    this.registerCapability('onoff', 'SWITCH_BINARY');
  }
}
