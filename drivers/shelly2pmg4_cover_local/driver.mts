import ShellyLocalDriver from '../../lib/local/LocalDriver.mjs';
import type { ShellyGetDeviceInfoResponse } from '../../lib/component/components/Shelly/GetDeviceInfo.mjs';

export default class Shelly2PMGen4CoverLocalDriver extends ShellyLocalDriver {
  protected async onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): Promise<boolean> {
    return deviceInfo.id.toLowerCase().startsWith(this.baseDriverId) && deviceInfo.profile === 'cover';
  }
}
