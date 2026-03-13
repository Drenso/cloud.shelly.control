import ShellyLocalDriver from '../../lib/Driver.mjs';
import type { ShellyGetDeviceInfoResponse } from '../../lib/component/components/Shelly/GetDeviceInfo.mjs';

export default class Shelly2PMGen4CoverDriver extends ShellyLocalDriver {
  async onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): Promise<boolean> {
    return deviceInfo.id.toLowerCase().startsWith(this.baseDriverId) && deviceInfo.profile === 'cover';
  }
}
