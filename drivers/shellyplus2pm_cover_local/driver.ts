import ShellyLocalDriver from '../../lib/local/LocalDriver.js';
import type { ShellyGetDeviceInfoResponse } from '../../lib/component/components/Shelly/GetDeviceInfo.js';

export default class ShellyPlus2PMCoverLocalDriver extends ShellyLocalDriver {
  protected onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): boolean {
    return super.onPairMatchDevice(deviceInfo) && deviceInfo.profile === 'cover';
  }
}
