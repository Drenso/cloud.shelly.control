import type { ShellyGetDeviceInfoResponse } from '../../lib/component/components/Shelly/GetDeviceInfo.js';
import ShellyLocalDriver from '../../lib/local/LocalDriver.js';

export default class Shellyi4Gen4LocalDriver extends ShellyLocalDriver {
  protected onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): boolean {
    return super.onPairMatchDevice(deviceInfo) || deviceInfo.id.toLowerCase().startsWith('shellyi4dcg4');
  }
}
