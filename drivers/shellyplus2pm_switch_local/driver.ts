import type { ShellyGetDeviceInfoResponse } from '../../lib/component/components/Shelly/GetDeviceInfo.js';
import ShellyMultiSwitchInputLocalDriver from '../../lib/local/ShellyMultiSwitchInputLocalDriver.js';

export default class ShellyPlus2PMSwitchLocalDriver extends ShellyMultiSwitchInputLocalDriver {
  protected onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): boolean {
    return deviceInfo.id.toLowerCase().startsWith(this.baseDriverId) && deviceInfo.profile === 'switch';
  }
}
