import ShellyLocalDriver, { type ShellyDiscoveryResult } from '../local/driver.mjs';

export default class ShellyGen4PowerStripDriver extends ShellyLocalDriver {
  async onPairMatchDevice(discoveryResult: ShellyDiscoveryResult): Promise<boolean> {
    return discoveryResult.id.startsWith('ShellyPStripG4');
  }
}
