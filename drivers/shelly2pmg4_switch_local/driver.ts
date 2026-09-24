import type { ShellyGetDeviceInfoResponse } from '../../lib/component/components/Shelly/GetDeviceInfo.js';
import ShellyMultiSwitchInputLocalDriver from '../../lib/local/ShellyMultiSwitchInputLocalDriver.js';

export default class Shelly2PMGen4SwitchLocalDriver extends ShellyMultiSwitchInputLocalDriver {
  protected async onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): Promise<boolean> {
    return deviceInfo.id.toLowerCase().startsWith(this.baseDriverId) && deviceInfo.profile === 'switch';
  }
}
