import type { ShellyGetDeviceInfoResponse } from '../../lib/component/components/Shelly/GetDeviceInfo.js';
import ShellyLocalDriver from '../../lib/local/LocalDriver.js';

export default class Shellyi4Gen4LocalDriver extends ShellyLocalDriver {
  protected onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): boolean {
    const deviceModel = deviceInfo.id.slice(0, -13).toLowerCase();
    return deviceModel === this.baseDriverId || deviceModel === 'shellyi4dcg4';
  }
}
