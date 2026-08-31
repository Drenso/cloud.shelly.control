import ShellyLocalDriver from '../../lib/local/LocalDriver.js';
import type { ShellyGetDeviceInfoResponse } from '../../lib/component/components/Shelly/GetDeviceInfo.js';

export default class ShellyPlus2PMCoverLocalDriver extends ShellyLocalDriver {
  protected async onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): Promise<boolean> {
    return deviceInfo.id.toLowerCase().startsWith(this.baseDriverId) && deviceInfo.profile === 'cover';
  }
}
