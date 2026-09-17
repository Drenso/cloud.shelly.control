import type { ShellyGetDeviceInfoResponse } from '../../lib/component/components/Shelly/GetDeviceInfo.js';
import ShellyDoubleSwitchInputLocalDriver from '../../lib/local/ShellyDoubleSwitchInputLocalDriver.js';

export default class ShellyPlus2PMSwitchLocalDriver extends ShellyDoubleSwitchInputLocalDriver {
  protected async onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): Promise<boolean> {
    return deviceInfo.id.toLowerCase().startsWith(this.baseDriverId) && deviceInfo.profile === 'switch';
  }
}
